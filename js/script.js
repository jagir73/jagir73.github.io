function BackgroundLoad()
{
	document.getElementById("background").src = "/backgrounds/background" + Math.ceil(Math.random() * 6) + ".jpg";
}