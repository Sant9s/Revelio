extends SceneTree


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var house = load("res://demo_3d/casa_abandonada.tscn").instantiate()
	root.add_child(house)
	current_scene = house
	await physics_frame
	var player = house.get_node("Player")
	var npc = house.get_node("ExitSurvivor")
	var dialogue = house.get_node("Dialogue")
	assert(house.find_children("CierreOpaco", "MeshInstance3D", true, false).size() == 6)
	player.position = Vector3(-0.85, 0.02, 7.5)
	player.rotation.y = PI
	await physics_frame
	player._update_interaction(false)
	assert("Julián" in player.prompt.text)
	player._update_interaction(true)
	assert(dialogue.active and player.conversation_active)
	assert(Input.mouse_mode == Input.MOUSE_MODE_VISIBLE)
	var before: Vector3 = player.position
	Input.action_press("walk_forward")
	Input.action_press("sprint")
	Input.action_press("jump")
	for i in 8:
		await physics_frame
	assert(Vector2(player.position.x, player.position.z).distance_to(Vector2(before.x, before.z)) < 0.001)
	for action in ["walk_forward", "sprint", "jump"]:
		Input.action_release(action)
	for id in dialogue.LINES:
		dialogue._show_line(id)
		assert(dialogue.reading and not dialogue.choices.visible)
		assert(dialogue.heading.text == "Julián" and dialogue.speech.visible)
		for option in dialogue.LINES[id][1]:
			assert(dialogue.LINES.has(option[1]))
		dialogue._show_responses()
		assert(not dialogue.reading and dialogue.choices.visible)
		assert(not dialogue.speech.visible)
		var last = dialogue.choices.get_child(-1)
		if id != "hello":
			assert(last.text == "Quiero hablar de otra cosa.")
			last.pressed.emit()
			assert(dialogue.current_line == "hello" and not dialogue.reading)
			assert(dialogue.choices.get_child(-1).text == "Chau, nos vemos.")
	dialogue._show_line("hello")
	var advance := InputEventKey.new()
	advance.physical_keycode = KEY_E
	advance.pressed = true
	Input.parse_input_event(advance)
	await process_frame
	await process_frame
	assert(not dialogue.reading and dialogue.current_line == "hello")
	dialogue.choices.get_child(0).pressed.emit()
	assert(dialogue.current_line == "house")
	assert(dialogue.reading and not dialogue.choices.visible)
	dialogue._show_responses()
	dialogue.choices.get_child(-1).pressed.emit()
	assert(dialogue.current_line == "hello" and dialogue.active)
	dialogue.choices.get_child(-1).pressed.emit()
	assert(not dialogue.active and not player.conversation_active)
	if DisplayServer.get_name() != "headless":
		assert(Input.mouse_mode == Input.MOUSE_MODE_CAPTURED)
	npc.interact()
	var escape := InputEventKey.new()
	escape.keycode = KEY_ESCAPE
	escape.pressed = true
	Input.parse_input_event(escape)
	await process_frame
	await process_frame
	assert(not dialogue.active and not player.conversation_active)
	for room in ["Estudio", "Dormitorio"]:
		var door = house.get_node("Arquitectura/" + room + "/Puerta")
		door.interact()
		assert(door.opened)
	player._set_third_person(true)
	assert(player.third_person.current)
	player._set_third_person(false)
	assert(player.first_person.current)
	print("PASS: read before responding, E advances once, topic return, main-menu goodbye, movement lock, Escape, reopen, windows, doors and cameras")
	if "--preview-dialogue" in OS.get_cmdline_user_args():
		npc.interact()
	else:
		quit()
