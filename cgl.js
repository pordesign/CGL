/**
 * Canvas Graphic Library
 *
 * Copyright (c) 2012-2013 wesz/Por Design (pordesign.eu)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

var CGL_VERTEX_BUFFER_SIZE = 1024;
var CGL_POINTS = 1;
var CGL_LINES = 2;
var CGL_TRIANGLES = 3;
var CGL_QUADS = 4;

var CGL_2D_VERTEX_SHADER =
[
	'attribute vec2 a_position;',
	'attribute vec4 a_texcoord;',
	'attribute vec4 a_color;',

	'varying vec2 v_texcoord;',
	'varying vec4 v_color;',

	'uniform mat4 u_projmat;',

	'void main()',
	'{',
	'	gl_Position = u_projmat * vec4(a_position.x, a_position.y, 0, 1);',
	'	v_texcoord = a_texcoord.st;',
	'	v_color = a_color;',
	'}'
];

var CGL_2D_FRAGMENT_SHADER =
[
	'precision mediump float;',

	'varying vec2 v_texcoord;',
	'varying vec4 v_color;',

	'uniform sampler2D u_sampler;',

	'void main()',
	'{',
	'	vec2 texcoord = vec2(v_texcoord.s, v_texcoord.t);',
	'	vec4 color = texture2D(u_sampler, texcoord);',
	'	color *= v_color;',
	'	gl_FragColor = color;',
	'}',
];

var cgl =
{
	c: null,
	loc: { position: null, color: null, resolution: null, texcoord: null, sampler: null, projmat: null },
	s: 1.0,
	t: 1.0,
	r: 1.0,
	g: 1.0,
	b: 1.0,
	a: 1.0,
	mat: [ new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) ],
	textures: {},
	requested: 0,
	loaded: 0,
	texture: null,
	texture_none: null,
	program: null,
	buffer: { vertex: null, texcoord: null, color: null },
	data: { offset: 0, counter: 0, vertex: null, texcoord: null, color: null },
	ready_callback: null,

	create_shader: function(source, type)
	{
		var shader = this.c.createShader(type);
		this.c.shaderSource(shader, source);
		this.c.compileShader(shader);

		var compiled = this.c.getShaderParameter(shader, this.c.COMPILE_STATUS);

		if ( ! compiled)
		{
			var error = this.c.getShaderInfoLog(shader);

			alert(error);
			console.log(shader + ': ' + error);

			this.c.deleteShader(shader);

			return null;
		}

		return shader;
	},

	create_program: function(shaders, attributes, locations)
	{
		var program = this.c.createProgram();

		for (var i = 0; i < shaders.length; i++)
		{
			this.c.attachShader(program, shaders[i]);
		}

		if (attributes)
		{
			for (var i = 0; i < attributes.length; ++i)
			{
				this.c.bindAttribLocation(program, locations ? locations[i] : i, attributes[i]);
			}
		}

		this.c.linkProgram(program);

		var linked = this.c.getProgramParameter(program, this.c.LINK_STATUS);

		if ( ! linked)
		{
			var error = this.c.getProgramInfoLog(program);

			alert(error);
			console.log(program + ': ' + error);

			this.c.deleteProgram(program);

			return null;
		}

		return program;
	},

	load_texture: function(url)
	{
		if (typeof this.textures[url] != 'undefined')
		{
			return this.textures[url];
		}

		this.requested++;
		this.textures[url] = this.c.createTexture();
		var image = new Image();

		image.onload = function()
		{
			cgl.init_texture(image, cgl.textures[url]);
		};

		image.src = url;

		return this.textures[url];
	},

	init_texture: function(image, texture)
	{
		this.c.bindTexture(this.c.TEXTURE_2D, texture);
		this.c.texImage2D(this.c.TEXTURE_2D, 0, this.c.RGBA, this.c.RGBA, this.c.UNSIGNED_BYTE, image);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_MAG_FILTER, this.c.NEAREST);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_MIN_FILTER, this.c.NEAREST);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_S, this.c.CLAMP_TO_EDGE);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_T, this.c.CLAMP_TO_EDGE);

		this.c.bindTexture(this.c.TEXTURE_2D, null);
		this.loaded++;

		if (this.loaded >= this.requested)
		{
			this.ready_callback();
		}
	},

	setup: function(context, width, height, uw, vh)
	{
		if ( ! window.WebGLRenderingContext)
		{
			alert('No WebGL support');

			return;
		}

		this.c = context;

		if ( ! this.c)
		{
			alert('Couldn\'t initialize WebGL context');

			return;
		}

		var data = new Uint8Array([ 255, 255, 255, 255 ]);
		this.texture_none = this.c.createTexture();
		this.c.bindTexture(this.c.TEXTURE_2D, this.texture_none);
		this.c.texImage2D(this.c.TEXTURE_2D, 0, this.c.RGBA, 1, 1, 0, this.c.RGBA, this.c.UNSIGNED_BYTE, data);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_MAG_FILTER, this.c.NEAREST);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_MIN_FILTER, this.c.NEAREST);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_S, this.c.CLAMP_TO_EDGE);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_T, this.c.CLAMP_TO_EDGE);

		//this.texture_none = this.load_texture('empty.png');

		var vertex = this.create_shader(CGL_2D_VERTEX_SHADER.join("\n"), this.c.VERTEX_SHADER);
		var fragment = this.create_shader(CGL_2D_FRAGMENT_SHADER.join("\n"), this.c.FRAGMENT_SHADER);

		this.program = this.create_program([vertex, fragment]);

		this.c.useProgram(this.program);

		this.loc.position = this.c.getAttribLocation(this.program, 'a_position');
		this.loc.color = this.c.getAttribLocation(this.program, 'a_color');
		this.loc.texcoord = this.c.getAttribLocation(this.program, 'a_texcoord');

		this.c.enableVertexAttribArray(this.loc.position);
		this.c.enableVertexAttribArray(this.loc.color);
		this.c.enableVertexAttribArray(this.loc.texcoord);

		this.loc.sampler = this.c.getUniformLocation(this.program, 'u_sampler');

		this.c.uniform1i(this.loc.sampler2d, 0);
	},

	clear: function()
	{
		this.c.clear(this.c.COLOR_BUFFER_BIT, this.c.DEPTH_BUFFER_BIT);
	},

	clear_color: function(r, g, b, a)
	{
		this.c.clearColor(r, g, b, a || 1.0);
	},

	viewport: function(x, y, width, height)
	{
		this.c.viewport(x, y, width, height);
	},

	scissor: function(x, y, width, height)
	{
		this.c.scissor(x, y, width, height)
	},

	begin: function(primitive)
	{
		this.primitive = primitive;

		this.data.vertex = new Float32Array(CGL_VERTEX_BUFFER_SIZE * 2);
		this.data.texcoord = new Float32Array(CGL_VERTEX_BUFFER_SIZE * 2);
		this.data.color = new Float32Array(CGL_VERTEX_BUFFER_SIZE * 4);

		if (this.buffer.vertex == null)
		{
			this.buffer.vertex = this.c.createBuffer();
			this.c.bindBuffer(this.c.ARRAY_BUFFER, this.buffer.vertex);
			this.c.bufferData(this.c.ARRAY_BUFFER, CGL_VERTEX_BUFFER_SIZE * 2 * Float32Array.BYTES_PER_ELEMENT, this.c.STREAM_DRAW);
		}

		if (this.buffer.texcoord == null)
		{
			this.buffer.texcoord = this.c.createBuffer();
			this.c.bindBuffer(this.c.ARRAY_BUFFER, this.buffer.texcoord);
			this.c.bufferData(this.c.ARRAY_BUFFER, CGL_VERTEX_BUFFER_SIZE * 2 * Float32Array.BYTES_PER_ELEMENT, this.c.STREAM_DRAW);
		}

		if (this.buffer.color == null)
		{
			this.buffer.color = this.c.createBuffer();
			this.c.bindBuffer(this.c.ARRAY_BUFFER, this.buffer.color);
			this.c.bufferData(this.c.ARRAY_BUFFER, CGL_VERTEX_BUFFER_SIZE * 4 * Float32Array.BYTES_PER_ELEMENT, this.c.STREAM_DRAW);
		}

		this.loc.projmat = this.c.getUniformLocation(this.program, 'u_projmat');
		this.c.uniformMatrix4fv(this.loc.projmat, this.c.FALSE, this.mat[this.mat.length - 1]);
	},

	end: function()
	{
		if (this.data.offset == 0)
		{
			return;
		}

		var primitive = null;

		switch (this.primitive)
		{
			case CGL_POINTS:
				primitive = this.c.POINTS;
			break;

			case CGL_LINES:
				primitive = this.c.LINES;
			break;

			case CGL_TRIANGLES:
			case CGL_QUADS:
				primitive = this.c.TRIANGLES;
			break;
		}

		this.c.bindBuffer(this.c.ARRAY_BUFFER, this.buffer.vertex);
		this.c.bufferSubData(this.c.ARRAY_BUFFER, 0, this.data.vertex);
		this.c.vertexAttribPointer(this.loc.position, 2, this.c.FLOAT, false, 0, 0);
		this.c.enableVertexAttribArray(this.loc.position);

		this.c.bindBuffer(this.c.ARRAY_BUFFER, this.buffer.texcoord);
		this.c.bufferSubData(this.c.ARRAY_BUFFER, 0, this.data.texcoord);
		this.c.vertexAttribPointer(this.loc.texcoord, 2, this.c.FLOAT, false, 0, 0);
		this.c.enableVertexAttribArray(this.loc.texcoord);

		this.c.bindBuffer(this.c.ARRAY_BUFFER, this.buffer.color);
		this.c.bufferSubData(this.c.ARRAY_BUFFER, 0, this.data.color);
		this.c.vertexAttribPointer(this.loc.color, 4, this.c.FLOAT, false, 0, 0);
		this.c.enableVertexAttribArray(this.loc.color);

		this.c.bindTexture(this.c.TEXTURE_2D, this.texture);

		this.c.drawArrays(primitive, 0, this.data.offset);

		this.c.disableVertexAttribArray(this.loc.vertex);
		this.c.disableVertexAttribArray(this.loc.texcoord);
		this.c.disableVertexAttribArray(this.loc.color);

		this.data.offset = 0;
		this.data.counter = 0;
	},

	__set_vertex: function(offset, x, y)
	{
		this.data.vertex[(offset * 2) + 0] = x;
		this.data.vertex[(offset * 2) + 1] = y;
	},

	__get_vertex: function(offset)
	{
		return { x: this.data.vertex[(offset * 2) + 0], y: this.data.vertex[(offset * 2) + 1] };
	},

	__set_texcoord: function(offset, s, t)
	{
		this.data.texcoord[(offset * 2) + 0] = s;
		this.data.texcoord[(offset * 2) + 1] = t;
	},

	__get_texcoord: function(offset)
	{
		return { s: this.data.texcoord[(offset * 2) + 0], t: this.data.texcoord[(offset * 2) + 1] };
	},

	__set_color: function(offset, r, g, b, a)
	{
		this.data.color[(offset * 4) + 0] = r;
		this.data.color[(offset * 4) + 1] = g;
		this.data.color[(offset * 4) + 2] = b;
		this.data.color[(offset * 4) + 3] = a;
	},

	__get_color: function(offset)
	{
		return { r: this.data.color[(offset * 4) + 0], g: this.data.color[(offset * 4) + 1], b: this.data.color[(offset * 4) + 2], a: this.data.color[(offset * 4) + 3] };
	},

	vertex: function(x, y)
	{
		this.__set_vertex(this.data.offset, x, y);
		this.__set_texcoord(this.data.offset, this.s, this.t);
		this.__set_color(this.data.offset, this.r, this.g, this.b, this.a);

		this.data.counter++;

		if (this.primitive == CGL_QUADS && this.data.counter == 4)
		{
			var vertex = [];
			var texcoord = [];
			var color = [];

			for (var i = 0; i < 4; i++)
			{
				vertex.unshift(this.__get_vertex(this.data.offset - i));
				texcoord.unshift(this.__get_texcoord(this.data.offset - i));
				color.unshift(this.__get_color(this.data.offset - i));
			}

			this.__set_vertex(this.data.offset - 1, vertex[3].x, vertex[3].y);
			this.__set_texcoord(this.data.offset - 1, texcoord[3].s, texcoord[3].t);
			this.__set_color(this.data.offset - 1, color[3].r, color[3].g, color[3].b, color[3].a);

			this.data.offset++;

			this.__set_vertex(this.data.offset, vertex[1].x, vertex[1].y);
			this.__set_texcoord(this.data.offset, texcoord[1].s, texcoord[1].t);
			this.__set_color(this.data.offset, color[1].r, color[1].g, color[1].b, color[1].a);

			this.data.offset++;

			this.__set_vertex(this.data.offset, vertex[2].x, vertex[2].y);
			this.__set_texcoord(this.data.offset, texcoord[2].s, texcoord[2].t);
			this.__set_color(this.data.offset, color[2].r, color[2].g, color[2].b, color[2].a);

			this.data.counter = 0;
		}

		this.data.offset++;

		if (this.data.offset >= CGL_VERTEX_BUFFER_SIZE)
		{
			this.end();
		}
	},

	texcoord: function(s, t)
	{
		this.s = s;
		this.t = t;
	},

	color: function(r, g, b, a)
	{
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a || 1.0;
	},

	bind: function(texture)
	{
		this.texture = texture;
	},

	unbind: function()
	{
		this.texture = this.texture_none;
	},

	push_matrix: function()
	{
		var m = this.mat.length - 1;

		this.mat.push(new Float32Array(16));

		this.mat[m + 1][0] = this.mat[m][0]; this.mat[m + 1][1] = this.mat[m][1]; this.mat[m + 1][2] = this.mat[m][2]; this.mat[m + 1][3] = this.mat[m][3];
		this.mat[m + 1][4] = this.mat[m][4]; this.mat[m + 1][5] = this.mat[m][5]; this.mat[m + 1][6] = this.mat[m][6]; this.mat[m + 1][7] = this.mat[m][7];
		this.mat[m + 1][8] = this.mat[m][8]; this.mat[m + 1][9] = this.mat[m][9]; this.mat[m + 1][10] = this.mat[m][10]; this.mat[m + 1][11] = this.mat[m][11];
		this.mat[m + 1][12] = this.mat[m][12]; this.mat[m + 1][13] = this.mat[m][13]; this.mat[m + 1][14] = this.mat[m][14]; this.mat[m + 1][15] = this.mat[m][15];
	},

	pop_matrix: function()
	{
		if (this.mat.length <= 1)
		{
			return;
		}

		this.mat.pop();
	},

	load_identity: function()
	{
		var m = this.mat.length - 1;

		this.mat[m][0] = this.mat[m][5] = this.mat[m][10] = this.mat[m][15] = 1.0;
		this.mat[m][1] = this.mat[m][2] = this.mat[m][3] = this.mat[m][4] = this.mat[m][6] = this.mat[m][7] = 0.0;
		this.mat[m][8] = this.mat[m][9] = this.mat[m][11] = this.mat[m][12] = this.mat[m][13] = this.mat[m][14] = 0.0;
	},

	load_matrix: function(mat)
	{
		var m = this.mat.length - 1;

		this.mat[m][0] = mat[0]; this.mat[m][1] = mat[1]; this.mat[m][2] = mat[2]; this.mat[m][3] = mat[3];
		this.mat[m][4] = mat[4]; this.mat[m][5] = mat[5]; this.mat[m][6] = mat[6]; this.mat[m][7] = mat[7];
		this.mat[m][8] = mat[8]; this.mat[m][9] = mat[9]; this.mat[m][10] = mat[10]; this.mat[m][11] = mat[11];
		this.mat[m][12] = mat[12]; this.mat[m][13] = mat[13]; this.mat[m][14] = mat[14]; this.mat[m][15] = mat[15];
	},

	mult_matrix: function(mat)
	{
		var m = this.mat.length - 1;

		var a00 = this.mat[m][0], a01 = this.mat[m][1], a02 = this.mat[m][2], a03 = this.mat[m][3];
		var a10 = this.mat[m][4], a11 = this.mat[m][5], a12 = this.mat[m][6], a13 = this.mat[m][7];
		var a20 = this.mat[m][8], a21 = this.mat[m][9], a22 = this.mat[m][10], a23 = this.mat[m][11];
		var a30 = this.mat[m][12], a31 = this.mat[m][13], a32 = this.mat[m][14], a33 = this.mat[m][15];
		var b00 = mat[0], b01 = mat[1], b02 = mat[2], b03 = mat[3];
		var b10 = mat[4], b11 = mat[5], b12 = mat[6], b13 = mat[7];
		var b20 = mat[8], b21 = mat[9], b22 = mat[10], b23 = mat[11];
		var b30 = mat[12], b31 = mat[13], b32 = mat[14], b33 = mat[15];

		this.mat[m][0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
		this.mat[m][1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
		this.mat[m][2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
		this.mat[m][3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
		this.mat[m][4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
		this.mat[m][5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
		this.mat[m][6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
		this.mat[m][7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
		this.mat[m][8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
		this.mat[m][9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
		this.mat[m][10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
		this.mat[m][11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
		this.mat[m][12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
		this.mat[m][13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
		this.mat[m][14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
		this.mat[m][15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
	},

	translate: function(x, y, z)
	{
		var mat = new Float32Array(16);

		mat[0] = mat[5] = mat[10] = mat[15] = 1.0;
		mat[1] = mat[2] = mat[3] = mat[4] = mat[6] = mat[7] = mat[8] = mat[9] = mat[11] = 0.0;
		mat[12] = x || 0.0;
		mat[13] = y || 0.0;
		mat[14] = z || 0.0;

		this.mult_matrix(mat);
	},

	rotate: function(angle, x, y, z)
	{
		angle = Math.PI * angle / 180.0;
		var mat = new Float32Array(16);

		var sina = Math.sin(angle);
		var cosa = Math.cos(angle);
		var one_minus_cosa = 1.0 - cosa;
		var nxsq = x * x;
		var nysq = y * y;
		var nzsq = z * z;

		mat[0] = nxsq + (1.0 - nxsq) * cosa;
		mat[4] = x * y * one_minus_cosa - z * sina;
		mat[8] = x * z * one_minus_cosa + y * sina;
		mat[1] = x * y * one_minus_cosa + z * sina;
		mat[5] = nysq + (1.0 - nysq) * cosa;
		mat[9] = y * z * one_minus_cosa - x * sina;
		mat[2] = x * z * one_minus_cosa - y * sina;
		mat[6] = y * z * one_minus_cosa + x * sina;
		mat[10] = nzsq + (1.0 - nzsq) * cosa;

		mat[3] = mat[7] = mat[11] = mat[12] = mat[13] = mat[14] = 0.0;
		mat[15] = 1.0;

		this.mult_matrix(mat);
	},

	scale: function(x, y, z)
	{
		var mat = new Float32Array(16);

		mat[0] = x || 1.0;
		mat[5] = y || 1.0;
		mat[10] = z || 1.0;
		mat[15] = 1.0;
		mat[1] = mat[2] = mat[3] = mat[4] = mat[6] = mat[7] = 0.0;
		mat[8] = mat[9] = mat[11] = mat[12] = mat[13] = mat[14] = 0.0;

		this.mult_matrix(mat);
	},

	ortho: function(left, right, bottom, top, near, far)
	{
		var dx = right - left;
		var dy = top - bottom;
		var dz = far - near;

		var tx = -(right + left) / dx;
		var ty = -(top + bottom) / dy;
		var tz = -(far + near) / dz;

		var sx = 2.0 / dx;
		var sy = 2.0 / dy;
		var sz = -2.0 / dz;

		var mat = new Float32Array(16);
		mat[0] = sx;
		mat[5] = sy;
		mat[10] = sz;
		mat[12] = tx;
		mat[13] = ty;
		mat[14] = tz;
		mat[15] = 1.0;
		mat[1] = mat[2] = mat[3] = mat[4] = mat[6] = mat[7] = mat[8] = mat[9] = 0.0;

		this.mult_matrix(mat);
	},

	blend_alpha: function()
	{
		this.c.enable(this.c.BLEND);
		this.c.blendFunc(this.c.SRC_ALPHA, this.c.ONE_MINUS_SRC_ALPHA);
	},

	blend_add: function()
	{
		this.c.enable(this.c.BLEND);
		this.c.blendFunc(this.c.SRC_ALPHA, this.c.ONE);
	},

	blend_multiply: function()
	{
		this.c.enable(this.c.BLEND);
		this.c.blendFunc(this.c.ZERO, this.c.SRC_COLOR);
	},

	blend_dodge: function()
	{
		this.c.enable(this.c.BLEND);
		this.c.blendFunc(this.c.DST_COLOR, this.c.ONE);
	},

	depth_enable: function(depth_mask)
	{
		this.c.depthMask(depth_mask || false);
		this.c.enable(this.c.DEPTH_TEST);
	},

	depth_disable: function(depth_mask)
	{
		this.c.disable(this.c.DEPTH_TEST);
		this.c.depthMask(depth_mask || false);
	},

	filter_nearest: function()
	{
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_MAG_FILTER, this.c.NEAREST);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_MIN_FILTER, this.c.NEAREST);
	},

	filter_lienar: function()
	{
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_MAG_FILTER, this.c.LINEAR);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_MIN_FILTER, this.c.LINEAR);
	},

	wrap_clamp: function()
	{
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_S, this.c.CLAMP);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_T, this.c.CLAMP);
	},

	wrap_clamp_to_edge: function()
	{
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_S, this.c.CLAMP_TO_EDGE);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_T, this.c.CLAMP_TO_EDGE);
	},

	wrap_repeat: function()
	{
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_S, this.c.REPEAT);
		this.c.texParameteri(this.c.TEXTURE_2D, this.c.TEXTURE_WRAP_T, this.c.REPEAT);
	},

	write: function(x, y, text, width, height, align, render, hs, vs)
	{
		if (typeof text != 'string')
		{
			text += '';
		}

		render = render || true;
		width = width || 16;
		height = height || 16;
		align = align || 0;
		hs = hs || 0;
		vs = vs || 0;

		var sx = x;
		var part = 0.0625;
		var trans = 0;
		var len = text.length;

		switch (align)
		{
			case 1:
				trans = -(len * (width + hs));
			break;
			case 2:
				trans = -(len * (width + hs) / 2);
			break;
		};

		cgl.blend_alpha();

		cgl.begin(CGL_QUADS);

		for (var i = 0; i < len; i++)
		{
			var c = text.charCodeAt(i);

			if (c != 10)
			{
				var u = parseInt(c % 16) * part;
				var v = parseInt(c / 16) * part;

				cgl.texcoord(u, v);
				cgl.vertex(x + trans, y);
				cgl.texcoord(u + part, v);
				cgl.vertex(x + trans + width, y);
				cgl.texcoord(u + part, v + part);
				cgl.vertex(x + trans + width, y + height);
				cgl.texcoord(u, v + part);
				cgl.vertex(x + trans, y + height);

				x += width + hs;
			} else
			{
				x = sx;
				y += height + vs;
			}
		}


		if (render)
		{
			cgl.end();
		}
	},

	ready: function(callback)
	{
		this.ready_callback = callback;
	}
};
