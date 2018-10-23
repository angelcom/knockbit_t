knock_robot_neopixel.onCmdReceived("alm", function ({ cmd, args }) {
    switch (args) {
        case "0":
            break;
        default:
            music.playTone(523, 50)
            music.playTone(988, 50)
            music.playTone(523, 50)
            music.playTone(988, 50)
            music.playTone(523, 50)
            music.playTone(988, 50)
            break;
    }
})
knock_robot_neopixel.onCmdReceived("mp3", function ({ cmd, args }) {
	
})
// autohandle message, user 4 pixel led
knock_robot_neopixel.init(true, 4)
