shader_type spatial;

uniform vec4 paint : source_color = vec4(0.50, 0.43, 0.34, 1.0);
uniform vec4 accent : source_color = vec4(0.25, 0.19, 0.12, 1.0);
uniform int finish = 0; // Wallpaper, floorboards, tiles, woodwork, textile, plaster.
varying vec3 world_point;
varying vec3 world_normal;

float grain(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise_2d(vec2 p) {
	vec2 i = floor(p);
	vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(p));
	return mix(mix(grain(i), grain(i + vec2(1, 0)), f.x),
		mix(grain(i + vec2(0, 1)), grain(i + vec2(1, 1)), f.x), f.y);
}

void vertex() {
	world_point = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	world_normal = normalize(MODEL_NORMAL_MATRIX * NORMAL);
}

void fragment() {
	vec2 wall = vec2(abs(world_normal.x) > abs(world_normal.z) ? world_point.z : world_point.x, world_point.y);
	vec2 floor_point = world_point.xz;
	vec2 uv = abs(world_normal.y) > 0.65 ? floor_point : wall;
	float stain = noise_2d(uv * 1.8) * 0.67 + noise_2d(uv * 6.4) * 0.33;
	float grit = grain(floor(uv * 180.0));
	vec3 tone = paint.rgb;

	if (finish == 0) {
		vec2 pattern = fract(wall * vec2(4.4, 2.7)) - 0.5;
		float motif = abs(pattern.x) * 1.15 + abs(pattern.y);
		float detail = 1.0 - smoothstep(0.016, 0.055, abs(motif - 0.22));
		float stripe = 1.0 - smoothstep(0.019, 0.043, abs(pattern.x));
		tone = mix(tone, accent.rgb, detail * 0.30 + stripe * 0.13);
		float damage = stain + 0.19 * noise_2d(wall * 21.0) + 0.15 * (1.0 - smoothstep(0.0, 1.3, wall.y));
		tone = mix(tone, vec3(0.32, 0.28, 0.23), smoothstep(0.70, 0.78, damage) * 0.85);
	} else if (finish == 1) {
		float row = floor(floor_point.x * 6.6);
		vec2 plank = vec2(floor_point.x * 6.6, (floor_point.y + grain(vec2(row, 5.0)) * 2.0) / 1.7);
		vec2 edge = min(fract(plank), 1.0 - fract(plank));
		float seam = smoothstep(0.007, 0.025, edge.x) * smoothstep(0.003, 0.008, edge.y);
		float board_tone = grain(floor(plank));
		float fiber = noise_2d(floor_point * vec2(115.0, 1.6));
		tone = mix(accent.rgb, tone * (0.75 + board_tone * 0.29 + fiber * 0.17), seam);
	} else if (finish == 2) {
		vec2 tile = uv * 4.0;
		vec2 edge = min(fract(tile), 1.0 - fract(tile));
		float seam = smoothstep(0.017, 0.042, min(edge.x, edge.y));
		float checkered = mod(floor(tile.x) + floor(tile.y), 2.0);
		tone = mix(vec3(0.19, 0.17, 0.14), mix(tone, accent.rgb, checkered * 0.85), seam);
	} else if (finish == 3) {
		float fiber = noise_2d(uv * vec2(42.0, 2.1));
		tone *= 0.78 + 0.28 * fiber;
	} else if (finish == 4) {
		float threads = sin(uv.x * 92.0) * sin(uv.y * 105.0);
		vec2 repeat = abs(fract(uv * vec2(3.1, 3.1)) - 0.5);
		float motif = 1.0 - smoothstep(0.012, 0.065, abs(repeat.x + repeat.y - 0.25));
		tone = mix(tone, accent.rgb, motif * 0.44);
		tone *= 0.92 + 0.08 * threads;
	}
	ALBEDO = tone * (0.75 + stain * 0.34 + grit * 0.12);
	ROUGHNESS = 0.94;
}
