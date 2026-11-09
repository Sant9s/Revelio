shader_type spatial;

uniform vec4 base_color : source_color = vec4(0.36, 0.33, 0.28, 1.0);
varying vec3 world_position;

float grain(vec3 p) {
	return fract(sin(dot(p, vec3(17.13, 63.93, 11.17))) * 43758.5453);
}

float mottling(vec3 p) {
	vec3 cell = floor(p);
	vec3 f = smoothstep(vec3(0.0), vec3(1.0), fract(p));
	float low = mix(mix(grain(cell), grain(cell + vec3(1, 0, 0)), f.x),
		mix(grain(cell + vec3(0, 1, 0)), grain(cell + vec3(1, 1, 0)), f.x), f.y);
	float high = mix(mix(grain(cell + vec3(0, 0, 1)), grain(cell + vec3(1, 0, 1)), f.x),
		mix(grain(cell + vec3(0, 1, 1)), grain(cell + vec3(1, 1, 1)), f.x), f.y);
	return mix(low, high, f.z);
}

void vertex() {
	world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float stain = 0.70 + 0.37 * mottling(world_position * 1.5);
	float grit = 0.91 + 0.15 * grain(floor(world_position * 43.0));
	ALBEDO = base_color.rgb * stain * grit;
	ROUGHNESS = 0.95;
}
