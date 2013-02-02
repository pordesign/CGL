
var angle = 0;
var zoom = 0;

window.onload = function()
{
	var context = document.getElementById('cul').getContext('experimental-webgl');

	cgl.setup(context, 1024, 768);

	cgl.viewport(0, 0, 1024, 768);
	cgl.scissor(0, 0, 1024, 768);

	cgl.load_identity();
	cgl.ortho(0, 1024, 768, 0, -100, 100);
};

setInterval( function()
{
	cgl.clear_color(0.5, 0.5, 0.5);
	cgl.clear();

	cgl.load_identity();
	cgl.ortho(0, 1024, 768, 0, -100, 100);
	cgl.translate(512, 386);
	cgl.rotate(angle, 0, 0, 1);
	cgl.scale(zoom, zoom);
	cgl.translate(-512, -386);

	cgl.unbind();

	cgl.begin(CGL_TRIANGLES);
		cgl.color(1, 0, 0);
		cgl.vertex(50, 50);
		cgl.color(0, 1, 0);
		cgl.vertex(800, 300);
		cgl.color(0, 0, 1);
		cgl.vertex(500, 600);
	cgl.end();

	angle += 1;
	zoom = 1.0 + Math.cos(new Date().getTime() / 1000);
}, 1000 / 60);
