extends StaticBody3D


func _process(delta: float) -> void:
	$Survivor.animate_motion(Vector3.ZERO, 3.5, 5.6, true, delta)


func get_interaction_prompt() -> String:
	return "E · Hablar con Julián"


func interact() -> void:
	$"../Dialogue".open_dialogue()
