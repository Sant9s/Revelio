extends CharacterBody2D

@export var speed: float = 200.0

enum Facing { RIGHT, LEFT, UP, DOWN }

var facing: Facing = Facing.DOWN

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D


func _ready() -> void:
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	update_animation(false)


func _physics_process(_delta: float) -> void:
	var direction = Input.get_vector(
		"ui_left",
		"ui_right",
		"ui_up",
		"ui_down"
	)

	update_facing(direction)
	velocity = direction * speed
	move_and_slide()
	update_animation(get_real_velocity().length_squared() > 0.01)


func update_facing(direction: Vector2) -> void:
	# Al detenerse, conserva la imagen del ultimo movimiento.
	if direction == Vector2.ZERO:
		return

	if absf(direction.x) >= absf(direction.y):
		facing = Facing.RIGHT if direction.x > 0.0 else Facing.LEFT
	else:
		facing = Facing.DOWN if direction.y > 0.0 else Facing.UP

func update_animation(walking: bool) -> void:
	var animation_name: StringName = &"walk_down"
	match facing:
		Facing.RIGHT:
			animation_name = &"walk_right"
		Facing.LEFT:
			animation_name = &"walk_left"
		Facing.UP:
			animation_name = &"walk_up"
		Facing.DOWN:
			animation_name = &"walk_down"

	if sprite.animation != animation_name:
		sprite.animation = animation_name
		sprite.frame = 0

	if walking:
		sprite.play(animation_name)
	else:
		# El cuadro cero es la pose quieta de la ultima direccion.
		sprite.stop()
		sprite.frame = 0
