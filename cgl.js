/**
 * Canvas Graphic Library
 *
 * Copyright (c) 2012-2013 wesz/ether (onether.com)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

window.CGL = (function(_cgl)
{
	_cgl = function()
	{
		var _cgl = this;

		_cgl.context = null;
		_cgl.loc = { position: null, color: null, resolution: null, texcoord: null, sampler: null, projmat: null };
		_cgl.s = 1.0;
		_cgl.t = 1.0;
		_cgl.r = 1.0;
		_cgl.g =  1.0;
		_cgl.b = 1.0;
		_cgl.a = 1.0;
		_cgl.mat = [ new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) ];
		_cgl.textures = {};
		_cgl.requested = 0;
		_cgl.loaded = 0;
		_cgl.texture = null;
		_cgl.texture_none = null;
		_cgl.program = null;
		_cgl.buffer = { vertex: null, texcoord: null, color: null };
		_cgl.data = { offset: 0, counter: 0, vertex: null, texcoord: null, color: null };
		_cgl.ready_callback = null;

		return _cgl;
	};

	_cgl.prototype.create_shader = function(source, type)
	{
		var cgl = this;

		var shader = cgl.context.createShader(type);
		cgl.context.shaderSource(shader, source);
		cgl.context.compileShader(shader);

		var compiled = cgl.context.getShaderParameter(shader, cgl.context.COMPILE_STATUS);

		if ( ! compiled)
		{
			var error = cgl.context.getShaderInfoLog(shader);

			alert(error);
			console.log(shader + ': ' + error);

			cgl.context.deleteShader(shader);

			return null;
		}

		return shader;
	};

	_cgl.prototype.create_program = function(shaders, attributes, locations)
	{
		var cgl = this;

		var program = cgl.context.createProgram();

		for (var i = 0; i < shaders.length; i++)
		{
			cgl.context.attachShader(program, shaders[i]);
		}

		if (attributes)
		{
			for (var i = 0; i < attributes.length; ++i)
			{
				cgl.context.bindAttribLocation(program, locations ? locations[i] : i, attributes[i]);
			}
		}

		cgl.context.linkProgram(program);

		var linked = cgl.context.getProgramParameter(program, cgl.context.LINK_STATUS);

		if ( ! linked)
		{
			var error = cgl.context.getProgramInfoLog(program);

			alert(error);
			console.log(program + ': ' + error);

			cgl.context.deleteProgram(program);

			return null;
		}

		return program;
	};

	_cgl.prototype.pow2 = function(x)
	{
		var logbase2 = Math.log(x) / Math.log(2);

		return Math.round(Math.pow(2.0, parseInt(Math.ceil(logbase2))));
	};

	_cgl.prototype.load_texture = function(url)
	{
		var cgl = this;

		if (typeof cgl.textures[url] != 'undefined')
		{
			return cgl.textures[url];
		}

		cgl.requested++;
		cgl.textures[url] = cgl.context.createTexture();

		var image = new Image();

		image.onload = function()
		{
			var w = image.width;
			var h = image.height;
			var w2 = cgl.pow2(w);
			var h2 = cgl.pow2(h);

			if (w != w2 || h != h2)
			{
				var canvas = document.createElement('canvas');
				var ctx = canvas.getContext('2d');

				canvas.width = w2;
				canvas.height = h2;

				ctx.drawImage(image, 0, 0, w, h, 0, 0, w2, h2);

				cgl.init_texture(ctx.getImageData(0, 0, w2, h2), cgl.textures[url]);

				delete canvas;
			} else
			{
				cgl.init_texture(image, cgl.textures[url]);
			}
		};

		image.src = url;

		return cgl.textures[url];
	};

	_cgl.prototype.init_texture = function(image, texture)
	{
		var cgl = this;

		cgl.context.bindTexture(cgl.context.TEXTURE_2D, texture);
		cgl.context.texImage2D(cgl.context.TEXTURE_2D, 0, cgl.context.RGBA, cgl.context.RGBA, cgl.context.UNSIGNED_BYTE, image);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_MAG_FILTER, cgl.context.NEAREST);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_MIN_FILTER, cgl.context.NEAREST);

		cgl.wrap_repeat();

		cgl.context.bindTexture(cgl.context.TEXTURE_2D, null);
		cgl.loaded++;

		if (cgl.loaded >= cgl.requested)
		{
			cgl.ready_callback();
		}
	};

	_cgl.prototype.init = function(context)
	{
		var cgl = this;

		if ( ! window.WebGLRenderingContext)
		{
			alert('No WebGL support');

			return;
		}

		cgl.context = context;

		if ( ! cgl.context)
		{
			alert('Couldn\'t initialize WebGL context');

			return;
		}

		var data = new Uint8Array([ 255, 255, 255, 255 ]);
		cgl.texture_none = cgl.context.createTexture();
		cgl.context.bindTexture(cgl.context.TEXTURE_2D, cgl.texture_none);
		cgl.context.texImage2D(cgl.context.TEXTURE_2D, 0, cgl.context.RGBA, 1, 1, 0, cgl.context.RGBA, cgl.context.UNSIGNED_BYTE, data);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_MAG_FILTER, cgl.context.NEAREST);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_MIN_FILTER, cgl.context.NEAREST);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_WRAP_S, cgl.context.CLAMP_TO_EDGE);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_WRAP_T, cgl.context.CLAMP_TO_EDGE);

		var vertex = cgl.create_shader
		([
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
		].join("\n"), cgl.context.VERTEX_SHADER);

		var fragment = cgl.create_shader
		([
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
			'}'
		].join("\n"), cgl.context.FRAGMENT_SHADER);

		cgl.program = cgl.create_program([vertex, fragment]);

		cgl.context.useProgram(cgl.program);

		cgl.loc.position = cgl.context.getAttribLocation(cgl.program, 'a_position');
		cgl.loc.color = cgl.context.getAttribLocation(cgl.program, 'a_color');
		cgl.loc.texcoord = cgl.context.getAttribLocation(cgl.program, 'a_texcoord');

		cgl.context.enableVertexAttribArray(cgl.loc.position);
		cgl.context.enableVertexAttribArray(cgl.loc.color);
		cgl.context.enableVertexAttribArray(cgl.loc.texcoord);

		cgl.loc.sampler = cgl.context.getUniformLocation(cgl.program, 'u_sampler');

		cgl.context.uniform1i(cgl.loc.sampler2d, 0);
	};

	_cgl.prototype.resize = function(width, height, uw, vh)
	{
		var cgl = this;

		cgl.viewport(0, 0, width, height);
		cgl.scissor(0, 0, width, height);

		cgl.load_identity();
		cgl.ortho(0, uw, vh, 0, -100, 100);
	};

	_cgl.prototype.clear = function()
	{
		var cgl = this;

		cgl.context.clear(cgl.context.COLOR_BUFFER_BIT);
	};

	_cgl.prototype.clear_color = function(r, g, b, a)
	{
		var cgl = this;

		cgl.context.clearColor(r, g, b, a || 1.0);
	};

	_cgl.prototype.viewport = function(x, y, width, height)
	{
		var cgl = this;

		cgl.context.viewport(x, y, width, height);
	};

	_cgl.prototype.scissor = function(x, y, width, height)
	{
		var cgl = this;

		cgl.context.scissor(x, y, width, height)
	};

	_cgl.prototype.begin = function(primitive)
	{
		var cgl = this;

		cgl.primitive = primitive;

		cgl.data.vertex = new Float32Array(_cgl.VERTEX_BUFFER_SIZE * 2);
		cgl.data.texcoord = new Float32Array(_cgl.VERTEX_BUFFER_SIZE * 2);
		cgl.data.color = new Float32Array(_cgl.VERTEX_BUFFER_SIZE * 4);

		if (cgl.buffer.vertex == null)
		{
			cgl.buffer.vertex = cgl.context.createBuffer();
			cgl.context.bindBuffer(cgl.context.ARRAY_BUFFER, cgl.buffer.vertex);
			cgl.context.bufferData(cgl.context.ARRAY_BUFFER, _cgl.VERTEX_BUFFER_SIZE * 2 * Float32Array.BYTES_PER_ELEMENT, cgl.context.STREAM_DRAW);
		}

		if (cgl.buffer.texcoord == null)
		{
			cgl.buffer.texcoord = cgl.context.createBuffer();
			cgl.context.bindBuffer(cgl.context.ARRAY_BUFFER, cgl.buffer.texcoord);
			cgl.context.bufferData(cgl.context.ARRAY_BUFFER, _cgl.VERTEX_BUFFER_SIZE * 2 * Float32Array.BYTES_PER_ELEMENT, cgl.context.STREAM_DRAW);
		}

		if (cgl.buffer.color == null)
		{
			cgl.buffer.color = cgl.context.createBuffer();
			cgl.context.bindBuffer(cgl.context.ARRAY_BUFFER, cgl.buffer.color);
			cgl.context.bufferData(cgl.context.ARRAY_BUFFER, _cgl.VERTEX_BUFFER_SIZE * 4 * Float32Array.BYTES_PER_ELEMENT, cgl.context.STREAM_DRAW);
		}

		cgl.loc.projmat = cgl.context.getUniformLocation(cgl.program, 'u_projmat');
		cgl.context.uniformMatrix4fv(cgl.loc.projmat, cgl.context.FALSE, cgl.mat[cgl.mat.length - 1]);
	};

	_cgl.prototype.end = function()
	{
		var cgl = this;

		if (cgl.data.offset == 0)
		{
			return;
		}

		var primitive = null;

		switch (cgl.primitive)
		{
			case _cgl.POINTS:
				primitive = cgl.context.POINTS;
			break;

			case _cgl.LINES:
				primitive = cgl.context.LINES;
			break;

			case _cgl.TRIANGLES:
			case _cgl.QUADS:
				primitive = cgl.context.TRIANGLES;
			break;
		}

		cgl.context.bindBuffer(cgl.context.ARRAY_BUFFER, cgl.buffer.vertex);
		cgl.context.bufferSubData(cgl.context.ARRAY_BUFFER, 0, cgl.data.vertex);
		cgl.context.vertexAttribPointer(cgl.loc.position, 2, cgl.context.FLOAT, false, 0, 0);
		cgl.context.enableVertexAttribArray(cgl.loc.position);

		cgl.context.bindBuffer(cgl.context.ARRAY_BUFFER, cgl.buffer.texcoord);
		cgl.context.bufferSubData(cgl.context.ARRAY_BUFFER, 0, cgl.data.texcoord);
		cgl.context.vertexAttribPointer(cgl.loc.texcoord, 2, cgl.context.FLOAT, false, 0, 0);
		cgl.context.enableVertexAttribArray(cgl.loc.texcoord);

		cgl.context.bindBuffer(cgl.context.ARRAY_BUFFER, cgl.buffer.color);
		cgl.context.bufferSubData(cgl.context.ARRAY_BUFFER, 0, cgl.data.color);
		cgl.context.vertexAttribPointer(cgl.loc.color, 4, cgl.context.FLOAT, false, 0, 0);
		cgl.context.enableVertexAttribArray(cgl.loc.color);

		cgl.context.bindTexture(cgl.context.TEXTURE_2D, cgl.texture);

		cgl.context.drawArrays(primitive, 0, cgl.data.offset);

		cgl.context.disableVertexAttribArray(cgl.loc.vertex);
		cgl.context.disableVertexAttribArray(cgl.loc.texcoord);
		cgl.context.disableVertexAttribArray(cgl.loc.color);

		cgl.data.offset = 0;
		cgl.data.counter = 0;
	};

	_cgl.prototype.__set_vertex = function(offset, x, y)
	{
		var cgl = this;

		cgl.data.vertex[(offset * 2) + 0] = x;
		cgl.data.vertex[(offset * 2) + 1] = y;
	};

	_cgl.prototype.__get_vertex = function(offset)
	{
		var cgl = this;

		return { x: cgl.data.vertex[(offset * 2) + 0], y: cgl.data.vertex[(offset * 2) + 1] };
	};

	_cgl.prototype.__set_texcoord = function(offset, s, t)
	{
		var cgl = this;

		cgl.data.texcoord[(offset * 2) + 0] = s;
		cgl.data.texcoord[(offset * 2) + 1] = t;
	};

	_cgl.prototype.__get_texcoord = function(offset)
	{
		var cgl = this;

		return { s: cgl.data.texcoord[(offset * 2) + 0], t: cgl.data.texcoord[(offset * 2) + 1] };
	};

	_cgl.prototype.__set_color = function(offset, r, g, b, a)
	{
		var cgl = this;

		cgl.data.color[(offset * 4) + 0] = r;
		cgl.data.color[(offset * 4) + 1] = g;
		cgl.data.color[(offset * 4) + 2] = b;
		cgl.data.color[(offset * 4) + 3] = a;
	};

	_cgl.prototype.__get_color = function(offset)
	{
		var cgl = this;

		return { r: cgl.data.color[(offset * 4) + 0], g: cgl.data.color[(offset * 4) + 1], b: cgl.data.color[(offset * 4) + 2], a: cgl.data.color[(offset * 4) + 3] };
	};

	_cgl.prototype.vertex = function(x, y)
	{
		var cgl = this;

		cgl.__set_vertex(cgl.data.offset, x, y);
		cgl.__set_texcoord(cgl.data.offset, cgl.s, cgl.t);
		cgl.__set_color(cgl.data.offset, cgl.r, cgl.g, cgl.b, cgl.a);

		cgl.data.counter++;

		if (cgl.primitive == _cgl.QUADS && cgl.data.counter == 4)
		{
			var vertex = [];
			var texcoord = [];
			var color = [];

			for (var i = 0; i < 4; i++)
			{
				vertex.unshift(cgl.__get_vertex(cgl.data.offset - i));
				texcoord.unshift(cgl.__get_texcoord(cgl.data.offset - i));
				color.unshift(cgl.__get_color(cgl.data.offset - i));
			}

			cgl.__set_vertex(cgl.data.offset - 1, vertex[3].x, vertex[3].y);
			cgl.__set_texcoord(cgl.data.offset - 1, texcoord[3].s, texcoord[3].t);
			cgl.__set_color(cgl.data.offset - 1, color[3].r, color[3].g, color[3].b, color[3].a);

			cgl.data.offset++;

			cgl.__set_vertex(cgl.data.offset, vertex[1].x, vertex[1].y);
			cgl.__set_texcoord(cgl.data.offset, texcoord[1].s, texcoord[1].t);
			cgl.__set_color(cgl.data.offset, color[1].r, color[1].g, color[1].b, color[1].a);

			cgl.data.offset++;

			cgl.__set_vertex(cgl.data.offset, vertex[2].x, vertex[2].y);
			cgl.__set_texcoord(cgl.data.offset, texcoord[2].s, texcoord[2].t);
			cgl.__set_color(cgl.data.offset, color[2].r, color[2].g, color[2].b, color[2].a);

			cgl.data.counter = 0;
		}

		cgl.data.offset++;

		if (cgl.data.offset >= _cgl.VERTEX_BUFFER_SIZE)
		{
			cgl.end();
		}
	};

	_cgl.prototype.texcoord = function(s, t)
	{
		var cgl = this;

		cgl.s = s;
		cgl.t = t;
	};

	_cgl.prototype.color = function(r, g, b, a)
	{
		var cgl = this;

		cgl.r = r;
		cgl.g = g;
		cgl.b = b;
		cgl.a = a || 1.0;
	};

	_cgl.prototype.bind = function(texture)
	{
		var cgl = this;

		cgl.texture = texture;

		cgl.context.bindTexture(cgl.context.TEXTURE_2D, cgl.texture);

		if ( ! texture)
		{
			cgl.unbind();
		}
	};

	_cgl.prototype.unbind = function()
	{
		var cgl = this;

		cgl.texture = cgl.texture_none;

		cgl.context.bindTexture(cgl.context.TEXTURE_2D, cgl.texture);
	};

	_cgl.prototype.push_matrix = function()
	{
		var cgl = this;

		var m = cgl.mat.length - 1;

		cgl.mat.push(new Float32Array(16));

		cgl.mat[m + 1][0] = cgl.mat[m][0]; cgl.mat[m + 1][1] = cgl.mat[m][1]; cgl.mat[m + 1][2] = cgl.mat[m][2]; cgl.mat[m + 1][3] = cgl.mat[m][3];
		cgl.mat[m + 1][4] = cgl.mat[m][4]; cgl.mat[m + 1][5] = cgl.mat[m][5]; cgl.mat[m + 1][6] = cgl.mat[m][6]; cgl.mat[m + 1][7] = cgl.mat[m][7];
		cgl.mat[m + 1][8] = cgl.mat[m][8]; cgl.mat[m + 1][9] = cgl.mat[m][9]; cgl.mat[m + 1][10] = cgl.mat[m][10]; cgl.mat[m + 1][11] = cgl.mat[m][11];
		cgl.mat[m + 1][12] = cgl.mat[m][12]; cgl.mat[m + 1][13] = cgl.mat[m][13]; cgl.mat[m + 1][14] = cgl.mat[m][14]; cgl.mat[m + 1][15] = cgl.mat[m][15];
	};

	_cgl.prototype.pop_matrix = function()
	{
		var cgl = this;

		if (cgl.mat.length <= 1)
		{
			return;
		}

		cgl.mat.pop();
	};

	_cgl.prototype.load_identity = function()
	{
		var cgl = this;

		var m = cgl.mat.length - 1;

		cgl.mat[m][0] = cgl.mat[m][5] = cgl.mat[m][10] = cgl.mat[m][15] = 1.0;
		cgl.mat[m][1] = cgl.mat[m][2] = cgl.mat[m][3] = cgl.mat[m][4] = cgl.mat[m][6] = cgl.mat[m][7] = 0.0;
		cgl.mat[m][8] = cgl.mat[m][9] = cgl.mat[m][11] = cgl.mat[m][12] = cgl.mat[m][13] = cgl.mat[m][14] = 0.0;
	};

	_cgl.prototype.load_matrix = function(mat)
	{
		var cgl = this;

		var m = cgl.mat.length - 1;

		cgl.mat[m][0] = mat[0]; cgl.mat[m][1] = mat[1]; cgl.mat[m][2] = mat[2]; cgl.mat[m][3] = mat[3];
		cgl.mat[m][4] = mat[4]; cgl.mat[m][5] = mat[5]; cgl.mat[m][6] = mat[6]; cgl.mat[m][7] = mat[7];
		cgl.mat[m][8] = mat[8]; cgl.mat[m][9] = mat[9]; cgl.mat[m][10] = mat[10]; cgl.mat[m][11] = mat[11];
		cgl.mat[m][12] = mat[12]; cgl.mat[m][13] = mat[13]; cgl.mat[m][14] = mat[14]; cgl.mat[m][15] = mat[15];
	};

	_cgl.prototype.mult_matrix = function(mat)
	{
		var cgl = this;

		var m = cgl.mat.length - 1;

		var a00 = cgl.mat[m][0], a01 = cgl.mat[m][1], a02 = cgl.mat[m][2], a03 = cgl.mat[m][3];
		var a10 = cgl.mat[m][4], a11 = cgl.mat[m][5], a12 = cgl.mat[m][6], a13 = cgl.mat[m][7];
		var a20 = cgl.mat[m][8], a21 = cgl.mat[m][9], a22 = cgl.mat[m][10], a23 = cgl.mat[m][11];
		var a30 = cgl.mat[m][12], a31 = cgl.mat[m][13], a32 = cgl.mat[m][14], a33 = cgl.mat[m][15];
		var b00 = mat[0], b01 = mat[1], b02 = mat[2], b03 = mat[3];
		var b10 = mat[4], b11 = mat[5], b12 = mat[6], b13 = mat[7];
		var b20 = mat[8], b21 = mat[9], b22 = mat[10], b23 = mat[11];
		var b30 = mat[12], b31 = mat[13], b32 = mat[14], b33 = mat[15];

		cgl.mat[m][0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
		cgl.mat[m][1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
		cgl.mat[m][2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
		cgl.mat[m][3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
		cgl.mat[m][4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
		cgl.mat[m][5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
		cgl.mat[m][6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
		cgl.mat[m][7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
		cgl.mat[m][8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
		cgl.mat[m][9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
		cgl.mat[m][10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
		cgl.mat[m][11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
		cgl.mat[m][12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
		cgl.mat[m][13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
		cgl.mat[m][14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
		cgl.mat[m][15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
	};

	_cgl.prototype.translate = function(x, y, z)
	{
		var cgl = this;

		var mat = new Float32Array(16);

		mat[0] = mat[5] = mat[10] = mat[15] = 1.0;
		mat[1] = mat[2] = mat[3] = mat[4] = mat[6] = mat[7] = mat[8] = mat[9] = mat[11] = 0.0;
		mat[12] = x || 0.0;
		mat[13] = y || 0.0;
		mat[14] = z || 0.0;

		cgl.mult_matrix(mat);
	};

	_cgl.prototype.rotate = function(angle, x, y, z)
	{
		var cgl = this;

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

		cgl.mult_matrix(mat);
	};

	_cgl.prototype.scale = function(x, y, z)
	{
		var cgl = this;

		var mat = new Float32Array(16);

		mat[0] = x || 1.0;
		mat[5] = y || 1.0;
		mat[10] = z || 1.0;
		mat[15] = 1.0;
		mat[1] = mat[2] = mat[3] = mat[4] = mat[6] = mat[7] = 0.0;
		mat[8] = mat[9] = mat[11] = mat[12] = mat[13] = mat[14] = 0.0;

		cgl.mult_matrix(mat);
	};

	_cgl.prototype.ortho = function(left, right, bottom, top, near, far)
	{
		var cgl = this;

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

		cgl.mult_matrix(mat);
	};

	_cgl.prototype.blend_alpha = function()
	{
		var cgl = this;

		cgl.context.enable(cgl.context.BLEND);
		cgl.context.blendFunc(cgl.context.SRC_ALPHA, cgl.context.ONE_MINUS_SRC_ALPHA);
	};

	_cgl.prototype.blend_add = function()
	{
		var cgl = this;

		cgl.context.enable(cgl.context.BLEND);
		cgl.context.blendFunc(cgl.context.SRC_ALPHA, cgl.context.ONE);
	};

	_cgl.prototype.blend_multiply = function()
	{
		var cgl = this;

		cgl.context.enable(cgl.context.BLEND);
		cgl.context.blendFunc(cgl.context.ZERO, cgl.context.SRC_COLOR);
	};

	_cgl.prototype.blend_dodge = function()
	{
		var cgl = this;

		cgl.context.enable(cgl.context.BLEND);
		cgl.context.blendFunc(cgl.context.DST_COLOR, cgl.context.ONE);
	};

	_cgl.prototype.depth_enable = function(depth_mask)
	{
		var cgl = this;

		cgl.context.depthMask(depth_mask || false);
		cgl.context.enable(cgl.context.DEPTH_TEST);
	};

	_cgl.prototype.depth_disable = function(depth_mask)
	{
		var cgl = this;

		cgl.context.disable(cgl.context.DEPTH_TEST);
		cgl.context.depthMask(depth_mask || false);
	};

	_cgl.prototype.filter_nearest = function()
	{
		var cgl = this;

		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_MAG_FILTER, cgl.context.NEAREST);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_MIN_FILTER, cgl.context.NEAREST);
	};

	_cgl.prototype.filter_linear = function()
	{
		var cgl = this;

		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_MAG_FILTER, cgl.context.LINEAR);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_MIN_FILTER, cgl.context.LINEAR);
	};

	_cgl.prototype.wrap_clamp = function()
	{
		var cgl = this;

		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_WRAP_S, cgl.context.CLAMP);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_WRAP_T, cgl.context.CLAMP);
	};

	_cgl.prototype.wrap_clamp_to_edge = function()
	{
		var cgl = this;

		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_WRAP_S, cgl.context.CLAMP_TO_EDGE);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_WRAP_T, cgl.context.CLAMP_TO_EDGE);
	};

	_cgl.prototype.wrap_repeat = function()
	{
		var cgl = this;

		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_WRAP_S, cgl.context.REPEAT);
		cgl.context.texParameteri(cgl.context.TEXTURE_2D, cgl.context.TEXTURE_WRAP_T, cgl.context.REPEAT);
	};

	_cgl.prototype.sprite = function(x, y, s)
	{
		var cgl = this;

		var def =
		{
			width: 64,
			height: 64,
			angle: 0.0,
			rx: 0.0,
			ry: 0.0,
			flipx: false,
			flipy: false,
			framex: 0,
			framey: 0,
			framesx: 1,
			framesy: 1
		};

		for (var k in def)
		{
			if (typeof s[k] == 'undefined')
			{
				s[k] = def[k];
			}
		}

		var w = s.width / 2.0;
		var h = s.height / 2.0;


		var vertices =
		[
			[ -w, -h ],
			[ w, -h ],
			[ w, h ],
			[ -w, h ]
		];

		if (s.angle != 0.0)
		{
			var acos = Math.cos(-(s.angle * Math.PI / 180.0));
			var asin = Math.sin(-(s.angle * Math.PI / 180.0));
			var rx = s.rx;
			var ry = s.ry;

			vertices[0] =
			[
				(rx - w) * acos + (ry - h) * asin,
				- (rx - w) * asin + (ry - h) * acos
			];

			vertices[1] =
			[
				(rx + w) * acos + (ry - h) * asin,
				- (rx + w) * asin + (ry - h) * acos
			];

			vertices[2] =
			[
				(rx + w) * acos + (ry + h) * asin,
				- (rx + w) * asin + (ry + h) * acos
			];

			vertices[3] =
			[
				(rx - w) * acos + (ry + h) * asin,
				- (rx - w) * asin + (ry + h) * acos
			];
		}

		var texcoords = [];
		var frame_sizex = 1.0 / s.framesx;
		var frame_sizey = 1.0 / s.framesy;
		var frame_stepx = frame_sizex * s.framex;
		var frame_stepy = frame_sizey * s.framey;

		u = frame_stepx;
		uw = frame_sizex;
		v = frame_stepy;
		vh = frame_sizey;

		texcoords[0] = [ u, v ];
		texcoords[1] = [ u + uw, v ];
		texcoords[2] = [ u + uw, v + vh ];
		texcoords[3] = [ u, v + vh ];

		if (typeof s.s != 'undefined')
		{
			texcoords[0][0] = s.s[0];
			texcoords[1][0] = s.s[1];
			texcoords[2][0] = s.s[1];
			texcoords[3][0] = s.s[0];

			u = s.s[0];
			uw = s.s[1] - s.s[0];
		}

		if (typeof s.t != 'undefined')
		{
			texcoords[0][1] = s.t[0];
			texcoords[1][1] = s.t[0];
			texcoords[2][1] = s.t[1];
			texcoords[3][1] = s.t[1];

			v = s.t[0];
			vh = s.t[1] - s.t[0];
		}

		if (s.flipx)
		{
			texcoords[0][0] = u + uw;
			texcoords[1][0] = u;
			texcoords[2][0] = u;
			texcoords[3][0]= u + uw;
		}

		if (s.flipy)
		{
			texcoords[0][1] = v + vh;
			texcoords[1][1] = v + vh;
			texcoords[2][1] = v;
			texcoords[3][1] = v;
		}

		for (var i = 0; i < 4; i++)
		{
			cgl.texcoord(texcoords[i][0], texcoords[i][1]);
			cgl.vertex(x + vertices[i][0], y + vertices[i][1]);
		}
	};

	_cgl.prototype.write = function(x, y, text, width, height, align, render, hs, vs)
	{
		var cgl = this;

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

		cgl.begin(_cgl.QUADS);

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
	};

	_cgl.prototype.ready = function(callback)
	{
		var cgl = this;

		cgl.ready_callback = callback || function() {};

		if (cgl.requested == 0)
		{
			cgl.ready_callback();
		}
	};

	_cgl.VERTEX_BUFFER_SIZE = 1024;
	_cgl.POINTS = 1;
	_cgl.LINES = 2;
	_cgl.TRIANGLES = 3;
	_cgl.QUADS = 4;

	return _cgl;
}(window.CGL || {}));
