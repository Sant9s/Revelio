extends Node3D

var gait_phase := 0.0
var gait_weight := 0.0
var sprint_weight := 0.0
var crouch_weight := 0.0
var air_weight := 0.0
var air_tuck := 0.0
var lead_foot := -1.0
var landing_weight := 0.0
var was_grounded := true
var breath_phase := 0.0
var travel_direction := Vector3.FORWARD
var bones: Dictionary[String, int] = {}

@onready var rig := find_children("*", "Skeleton3D", true, false)[0] as Skeleton3D


func _ready() -> void:
	for i in rig.get_bone_count():
		bones[rig.get_bone_name(i)] = i


func animate_motion(
	local_velocity: Vector3, walk_speed: float, sprint_speed: float, grounded: bool,
	delta: float, crouched: bool = false
) -> void:
	var planar := Vector3(local_velocity.x, 0.0, local_velocity.z)
	var speed := planar.length() if grounded else 0.0
	var desired_weight := clampf(speed / maxf(walk_speed, 0.01), 0.0, 1.0)
	if speed < 0.06:
		desired_weight = 0.0
	gait_weight = lerpf(gait_weight, desired_weight, 1.0 - exp(-11.0 * delta))
	var sprint_target := clampf((speed - walk_speed) / maxf(sprint_speed - walk_speed, 0.01), 0.0, 1.0)
	sprint_weight = lerpf(sprint_weight, sprint_target, 1.0 - exp(-9.0 * delta))
	crouch_weight = lerpf(crouch_weight, 1.0 if crouched else 0.0, 1.0 - exp(-18.0 * delta))
	breath_phase = fmod(breath_phase + TAU * 0.27 * delta, TAU)

	if was_grounded and not grounded:
		lead_foot = -1.0 if gait_phase < 0.5 else 1.0
	if grounded and not was_grounded and air_weight > 0.4:
		landing_weight = air_weight
	was_grounded = grounded
	air_weight = lerpf(air_weight, 0.0 if grounded else 1.0, 1.0 - exp(-16.0 * delta))
	air_tuck = clampf(0.68 + local_velocity.y * 0.12, 0.2, 1.0)
	landing_weight *= exp(-12.0 * delta)

	var half_stride := lerpf(lerpf(0.40, 0.49, sprint_weight), 0.22, crouch_weight)
	var stance_fraction := lerpf(0.55, 0.42, sprint_weight)
	stance_fraction = lerpf(stance_fraction, 0.62, crouch_weight)
	var turn := rotation.y if not grounded else 0.0
	if desired_weight > 0.0:
		var heading := planar.normalized()
		turn = -heading.x * deg_to_rad(50.0)
		var stride_distance := lerpf(0.48, half_stride * 2.0 / stance_fraction, gait_weight)
		gait_phase = fmod(gait_phase + speed * delta / stride_distance, 1.0)
		travel_direction = travel_direction.lerp(
			heading.rotated(Vector3.UP, -rotation.y), 1.0 - exp(-15.0 * delta)
		)
	elif gait_weight < 0.01:
		gait_phase = 0.0

	rotation.y = lerp_angle(rotation.y, turn, 1.0 - exp(-9.0 * delta))

	var stride := sin(gait_phase * TAU)
	var double_step := 0.5 - cos(gait_phase * TAU * 2.0) * 0.5
	var hips_height := lerpf(-0.135, -0.19, sprint_weight)
	hips_height += lerpf(0.026, 0.065, sprint_weight) * double_step
	var hips := Vector3(0.018 * stride, hips_height, 0.0) * gait_weight
	hips.y = lerpf(hips.y, -0.39 + 0.025 * double_step * gait_weight, crouch_weight)
	hips.z += 0.10 * crouch_weight
	hips.y -= 0.085 * landing_weight
	var pelvis := bones["Pelvis"]
	rig.set_bone_pose_position(pelvis, rig.get_bone_rest(pelvis).origin + hips)

	var breath := sin(breath_phase) * 0.013 * (1.0 - gait_weight)
	_rotate_bone("Spine", Vector3(
		travel_direction.z * lerpf(0.12, 0.27, sprint_weight) * gait_weight
			+ breath - 0.09 * air_weight - 0.16 * landing_weight - 0.52 * crouch_weight,
		0.11 * stride * gait_weight,
		(0.042 * stride - 0.05 * travel_direction.x) * gait_weight
	))
	_rotate_bone("HeadJoint", Vector3(
		-0.45 * breath + 0.36 * crouch_weight, -0.08 * stride * gait_weight, 0.0
	))

	var airborne_pose := 0.0 if grounded else air_weight
	_pose_leg("Left", -1.0, gait_phase, hips, half_stride, stance_fraction, airborne_pose)
	_pose_leg("Right", 1.0, fmod(gait_phase + 0.5, 1.0), hips, half_stride, stance_fraction, airborne_pose)

	for side in ["Left", "Right"]:
		var phase := gait_phase if side == "Left" else gait_phase + 0.5
		var arm_swing := cos(phase * TAU) * travel_direction.z
		var sign_x := -1.0 if side == "Left" else 1.0
		var air_shoulder := 0.35 if sign_x != lead_foot else 0.10
		_rotate_bone(side + "Shoulder", Vector3(
			lerpf(
				lerpf(0.34, 0.58, sprint_weight) * arm_swing * gait_weight,
				air_shoulder, air_weight
			) + 0.16 * crouch_weight,
			0.0, sign_x * (0.055 * gait_weight + 0.17 * air_weight)
		))
		_rotate_bone(side + "Elbow", Vector3(
			lerpf(
				(lerpf(0.38, 1.05, sprint_weight) + 0.19 * arm_swing) * gait_weight,
				0.75, air_weight
			) + 0.28 * crouch_weight,
			0.0, 0.0
		))


func _pose_leg(
	side: String, sign_x: float, phase: float, hips: Vector3, half_stride: float,
	stance_fraction: float, airborne_pose: float
) -> void:
	var thigh := bones[side + "Thigh"]
	var shin := bones[side + "Shin"]
	var foot := bones[side + "Foot"]
	var hip := rig.get_bone_global_rest(thigh).origin + hips
	var ankle := rig.get_bone_global_rest(foot).origin
	var upper := rig.get_bone_rest(shin).origin
	var lower := rig.get_bone_rest(foot).origin

	# The foot travels backward at ground level during contact, then arcs up to reset.
	var stride := lerpf(half_stride, -half_stride, phase / stance_fraction)
	var lift := 0.0
	var pitch := 0.0
	if phase > stance_fraction:
		var swing := (phase - stance_fraction) / (1.0 - stance_fraction)
		stride = lerpf(-half_stride, half_stride, smoothstep(0.0, 1.0, swing))
		lift = lerpf(lerpf(0.19, 0.29, sprint_weight), 0.08, crouch_weight) * sin(PI * swing)
		pitch = lerpf(0.20, 0.36, sprint_weight) * sin(TAU * swing) * -travel_direction.z * gait_weight
	var foot_target := ankle + gait_weight * (travel_direction * stride + Vector3.UP * lift)
	var lead := sign_x == lead_foot
	var jump_offset := Vector3(0.02 * sign_x, (0.24 if lead else 0.16) * air_tuck, -0.19 if lead else 0.15)
	foot_target = foot_target.lerp(ankle + jump_offset, airborne_pose)
	pitch = lerpf(pitch, 0.14 if lead else -0.26, airborne_pose)
	foot_target.x = sign_x * maxf(0.055, sign_x * foot_target.x)

	# Solve the two leg segments so the boot follows that target without stretching.
	var axis := (foot_target - hip).normalized()
	var distance := clampf((foot_target - hip).length(), 0.1, upper.length() + lower.length() - 0.001)
	var bend := (Vector3.FORWARD - axis * axis.dot(Vector3.FORWARD)).normalized()
	var along := (upper.length_squared() - lower.length_squared() + distance * distance) / (2.0 * distance)
	var height := sqrt(maxf(0.0, upper.length_squared() - along * along))
	var knee := hip + axis * along + bend * height
	var thigh_rotation := Quaternion(upper.normalized(), (knee - hip).normalized())
	var shin_rotation := Quaternion(lower.normalized(), (hip + axis * distance - knee).normalized())
	rig.set_bone_pose_rotation(thigh, thigh_rotation)
	rig.set_bone_pose_rotation(shin, thigh_rotation.inverse() * shin_rotation)
	rig.set_bone_pose_rotation(foot, shin_rotation.inverse() * Quaternion(Vector3.RIGHT, pitch))


func _rotate_bone(bone_name: String, euler: Vector3) -> void:
	rig.set_bone_pose_rotation(bones[bone_name], Quaternion.from_euler(euler))
