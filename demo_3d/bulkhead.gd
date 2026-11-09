extends AnimatableBody3D

var opening := false


func get_interaction_prompt() -> String:
	return "" if opening else "[E] Abrir compuerta"


func interact() -> void:
	if opening:
		return
	opening = true
	var tween := create_tween().set_process_mode(Tween.TWEEN_PROCESS_PHYSICS)
	tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(self, "position:y", position.y + 2.65, 1.1)
