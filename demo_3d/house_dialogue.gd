extends CanvasLayer

const LINES := {
	"hello": ["Al fin aparecés. Soy Julián. Te estaba esperando junto a la salida. Tapé las ventanas: prefiero que nadie nos vea desde la calle.", []],
	"house": ["La gente se fue cuando dejó de llegar agua. Después vinieron los saqueadores. En el estudio todavía quedan papeles; capaz nos dicen adónde fueron los dueños.", [["¿Y vos por qué te quedaste?", "why"]]],
	"why": ["Le prometí a mi hermano que lo iba a esperar acá. No apareció, pero todavía no pienso darlo por perdido.", [["Si encuentro alguna pista, te aviso.", "thanks"]]],
	"thanks": ["Gracias. Fijate si encontrás el nombre Tomás en esos papeles. Mientras tanto, me quedo cuidando la entrada.", [["¿Algo que deba saber antes de salir?", "outside"]]],
	"outside": ["La avenida está expuesta. Si salimos, conviene ir por los patios y buscar la vieja estación de bombeo. Pero primero revisá bien esta casa; no sabemos cuándo vamos a encontrar otro techo.", [["¿Qué sabés de esta casa?", "house"]]],
}

const MAIN_OPTIONS := [["¿Qué pasó acá?", "house"], ["¿Qué hay afuera?", "outside"], ["Chau, nos vemos.", "close"]]

var reading := false
var heading: Label
var active := false
var current_line := ""
var overlay: Control
var speech: Label
var choices: VBoxContainer
@onready var player = $"../Player"


func _ready() -> void:
	overlay = Control.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(overlay)
	var panel := PanelContainer.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_left = 24
	panel.offset_right = -24
	panel.offset_top = -290
	panel.offset_bottom = -20
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.055, 0.065, 0.055, 0.98)
	style.border_color = Color(0.65, 0.52, 0.31)
	style.set_border_width_all(2)
	style.content_margin_left = 22
	style.content_margin_right = 22
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	panel.add_theme_stylebox_override("panel", style)
	overlay.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	panel.add_child(column)
	heading = Label.new()
	heading.text = "Julián"
	heading.add_theme_color_override("font_color", Color(0.93, 0.77, 0.49))
	heading.add_theme_font_size_override("font_size", 22)
	column.add_child(heading)
	speech = Label.new()
	speech.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	speech.add_theme_font_size_override("font_size", 19)
	speech.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(speech)
	choices = VBoxContainer.new()
	choices.add_theme_constant_override("separation", 6)
	column.add_child(choices)
	overlay.hide()


func open_dialogue() -> void:
	if active:
		return
	active = true
	player.conversation_active = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	$"../HUD/Controls".hide()
	overlay.show()
	_show_line("hello")


func _show_line(id: String) -> void:
	if id == "close":
		close_dialogue()
		return
	if id == "main":
		current_line = "hello"
		_show_responses()
		return
	current_line = id
	reading = true
	heading.text = "Julián"
	speech.text = LINES[id][0]
	speech.show()
	_clear_choices()
	choices.hide()


func _clear_choices() -> void:
	for child in choices.get_children():
		choices.remove_child(child)
		child.queue_free()


func _show_responses() -> void:
	if not active:
		return
	reading = false
	speech.hide()
	heading.text = "Vos"
	_clear_choices()
	var options: Array = MAIN_OPTIONS.duplicate(true) if current_line == "hello" else LINES[current_line][1].duplicate(true)
	if current_line != "hello":
		options.append(["Quiero hablar de otra cosa.", "main"])
	for option in options:
		var button := Button.new()
		button.text = option[0]
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.custom_minimum_size.y = 36
		button.add_theme_font_size_override("font_size", 18)
		button.pressed.connect(_show_line.bind(option[1]))
		choices.add_child(button)
	choices.show()
	choices.get_child(0).grab_focus()


func close_dialogue() -> void:
	active = false
	reading = false
	player.conversation_active = false
	overlay.hide()
	$"../HUD/Controls".show()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _input(event: InputEvent) -> void:
	if not active:
		return
	if event.is_action_pressed("ui_cancel"):
		close_dialogue()
		get_viewport().set_input_as_handled()
	elif reading and (event.is_action_pressed("interact") or event.is_action_pressed("ui_accept")):
		get_viewport().set_input_as_handled()
		if not event.is_echo():
			_show_responses()
