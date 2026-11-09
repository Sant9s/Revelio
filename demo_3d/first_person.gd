extends CharacterBody3D

const SurvivorMotion = preload("res://demo_3d/survivor_motion.gd")
const CROUCH_HEIGHT := 1.22
const CROUCH_CAMERA_HEIGHT := 1.10

@export var walk_speed: float = 3.5
@export var sprint_speed: float = 5.6
@export var crouch_speed: float = 1.65
@export var jump_speed: float = 4.1
@export var mouse_sensitivity: float = 0.0023

var third_person_enabled := false
var conversation_active := false
var crouched := false
var standing_check := PhysicsShapeQueryParameters3D.new()

@onready var collision: CollisionShape3D = $Collision
@onready var look_pivot: Node3D = $LookPivot
@onready var standing_camera_height := look_pivot.position.y
@onready var first_person: Camera3D = $LookPivot/FirstPerson
@onready var camera_arm: SpringArm3D = $LookPivot/CameraArm
@onready var third_person: Camera3D = $LookPivot/CameraArm/ThirdPerson
@onready var survivor: SurvivorMotion = $Survivor
@onready var interaction_ray: RayCast3D = $LookPivot/InteractionRay
@onready var reticle: ColorRect = $"../HUD/Reticle"
@onready var prompt: Label = $"../HUD/Prompt"


func _ready() -> void:
	standing_check.shape = collision.shape
	standing_check.exclude = [get_rid()]
	standing_check.collision_mask = collision_mask
	collision.shape = collision.shape.duplicate()
	interaction_ray.add_exception(self)
	camera_arm.add_excluded_object(get_rid())
	_set_third_person(false)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _exit_tree() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func _unhandled_input(event: InputEvent) -> void:
	if conversation_active:
		return
	if event.is_action_pressed("ui_cancel"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif event.is_action_pressed("interact") and not event.is_echo() and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_update_interaction(true)
	elif event.is_action_pressed("toggle_camera"):
		_set_third_person(not third_person_enabled)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.screen_relative.x * mouse_sensitivity)
		look_pivot.rotation.x = clampf(
			look_pivot.rotation.x - event.screen_relative.y * mouse_sensitivity,
			deg_to_rad(-85.0), deg_to_rad(85.0)
		)


func _physics_process(delta: float) -> void:
	if conversation_active:
		_move_player(Vector2.ZERO, delta, false, false, crouched)
		reticle.visible = false
		prompt.text = ""
		return
	var captured := Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
	var movement := Vector2.ZERO
	if captured:
		movement = Input.get_vector("walk_left", "walk_right", "walk_forward", "walk_back")

	_move_player(
		movement, delta,
		captured and Input.is_action_pressed("sprint"),
		captured and Input.is_action_just_pressed("jump"),
		captured and Input.is_action_pressed("crouch")
	)
	_update_survivor_visibility()

	reticle.visible = captured
	if captured:
		_update_interaction(false)
	else:
		prompt.text = "Clic para volver al juego"


func _set_third_person(enabled: bool) -> void:
	third_person_enabled = enabled
	if enabled:
		third_person.make_current()
	else:
		first_person.make_current()
	_update_survivor_visibility()


func _update_survivor_visibility() -> void:
	# Near walls, hide the model before the shortened arm reaches it.
	survivor.visible = third_person_enabled and camera_arm.get_hit_length() > 0.95


func _move_player(
	movement: Vector2, delta: float, sprinting: bool,
	jump_requested: bool = false, crouch_requested: bool = false
) -> void:
	_update_crouch(crouch_requested, delta)
	var direction := transform.basis * Vector3(movement.x, 0.0, movement.y)
	var speed := maxf(walk_speed, sprint_speed) if sprinting else walk_speed
	if crouched:
		speed = crouch_speed
	velocity.x = direction.x * speed
	velocity.z = direction.z * speed
	if is_on_floor():
		velocity.y = jump_speed if jump_requested and not crouched else 0.0
	else:
		velocity += get_gravity() * delta
	move_and_slide()
	survivor.animate_motion(
		global_basis.inverse() * get_real_velocity(),
		crouch_speed if crouched else walk_speed, sprint_speed, is_on_floor(), delta, crouched
	)


func _update_crouch(requested: bool, delta: float) -> void:
	var standing_capsule := standing_check.shape as CapsuleShape3D
	var capsule := collision.shape as CapsuleShape3D
	if requested and not crouched:
		crouched = true
	elif crouched and not requested:
		# Lift the clearance query off the floor so only obstacles prevent standing.
		var center := Vector3.UP * (standing_capsule.height * 0.5 + 0.015)
		standing_check.transform = global_transform.translated_local(center)
		if get_world_3d().direct_space_state.intersect_shape(standing_check, 1).is_empty():
			crouched = false
	var height := CROUCH_HEIGHT if crouched else standing_capsule.height
	if not is_equal_approx(capsule.height, height):
		capsule.height = height
		collision.position.y = height * 0.5
	var eye_height := CROUCH_CAMERA_HEIGHT if crouched else standing_camera_height
	look_pivot.position.y = lerpf(look_pivot.position.y, eye_height, 1.0 - exp(-18.0 * delta))


func _update_interaction(pressed: bool) -> void:
	interaction_ray.force_raycast_update()
	var target := interaction_ray.get_collider()
	if is_instance_valid(target) and target.has_method("get_interaction_prompt"):
		prompt.text = target.get_interaction_prompt()
		if not prompt.text.is_empty() and pressed:
			target.interact()
			prompt.text = ""
	else:
		prompt.text = ""
