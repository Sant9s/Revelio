extends AnimatableBody3D

@export var swing_degrees: float = 105.0

var opened := false


func get_interaction_prompt() -> String:
	return "" if opened else "[E] Abrir puerta"


func interact() -> void:
	if opened:
		return
	opened = true
	var motion := create_tween().set_process_mode(Tween.TWEEN_PROCESS_PHYSICS)
	motion.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	motion.tween_property(self, "rotation:y", rotation.y + deg_to_rad(swing_degrees), 0.8)
