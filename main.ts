// 2018-10-7 makecode的substr默认长度10？太坑了
class MessageContainer {
    cmd: string;
    args: string;
}

//% color=#0062dB weight=96 icon="\uf294" block="KNOCKBIT"
namespace knock_robot_neopixel {
    //let delimiter = "^";
    let terminator = "\n";

    //let MIN_SEND_TIMEOUT = 100; // 最小发送间隔，500
    //let us = 0
    let BluetoothConnected: boolean = false

    //let SCAN_ULTRASONIC = false;// 超声波扫描前方障碍物
    let CMD_HANDLERS: LinkedKeyHandlerList = null;  // 自定义命令处理器
    //let UD_HANDLERS: LinkedIdHandlerList = null;  // 用户自动发送数据处理器
    // ROBOTBIT内建4个LED灯
    let strip: neopixel.Strip = null;
    let pixelCount = 0;// 默认4个pixel灯

    class LinkedKeyHandlerList {
        key: string;
        // microbit中的callbak最多支持3个参数
        callback: (container: MessageContainer) => void;
        next: LinkedKeyHandlerList
    }

    class LinkedIdHandlerList {
        id: number;
        callback: () => void;
        next: LinkedIdHandlerList
    }

    let messageContainer = new MessageContainer;

    //% mutate=objectdestructuring
    //% mutateText="My Arguments"
    //% mutateDefaults="cmd,args"
    //% blockId=knock_robot_neopixel_onCmdReceived
    //% block="当收到蓝牙数据时 |命令 %cmd"
    export function onCmdReceived(cmd: string, callback: (container: MessageContainer) => void) {
        let newHandler = new LinkedKeyHandlerList()
        newHandler.callback = callback;
        newHandler.key = cmd;
        newHandler.next = CMD_HANDLERS;
        CMD_HANDLERS = newHandler;
    }

    let splitString = (splitOnChar: string, input: string) => {
        let result: string[] = []
        let count = 0
        let startIndex = 0
        for (let index = 0; index < input.length; index++) {
            if (input.charAt(index) == splitOnChar) {
                result[count] = input.substr(startIndex, index - startIndex)
                startIndex = index + 1
                count = count + 1
            }
        }
        if (startIndex != input.length)
            result[count] = input.substr(startIndex, input.length - startIndex)
        return result;
    }

    function handleMessage(cmd: string, arg: string) {
        switch (cmd) {    // 1开启自动发送，0关闭自动发送
            case "str": // 显示消息
                basic.showString(arg);
                break;
            case "rst": // 重启
                control.reset();
                break;
            case "img": // 显示图案
                basic.showIcon(parseInt(arg));
                ledOnBoard("llp");// 回发板载led信息给敲比特
                break;
            case "led": // 点亮Microbit自带LED
            case "lnp": // 2018-7-24 更新为led neo pixel
                showLed(arg);
                break;
            case "lob": // led on-board 板载 5*5led
                ledOnBoard(arg);
                break;
            case "msc":// music // 直接播放频率
                playMusic(arg);
                break;
            default:    // 未知的消息
                break;
        }
    }

    let toneStartTime = 0;
    let tonebeat = 125;
    let currentDuration = 4;
    function playMusic(msg: string) {
        let cmd = msg.substr(0, 4);
        let arg = msg.substr(4, msg.length - 4);
        let frequency = arg;
        switch (cmd) {
            case "play":
                if (arg.length > 5) {
                    frequency = arg.substr(0, 4);
                    let duration = parseInt(arg.substr(5, 1));
                    currentDuration = duration > 0 ? duration : currentDuration;
                }
                music.playTone(parseInt(frequency), currentDuration * tonebeat);
                break;
            case "ring":
                if (tonebeat > 0)   // 等于0的时候放开就停止演奏
                    basic.pause(tonebeat * currentDuration - (input.runningTime() - toneStartTime) % tonebeat);
                if (arg.length > 5) {
                    frequency = arg.substr(0, 4);
                    let duration = parseInt(arg.substr(5, 1));
                    currentDuration = duration > 0 ? duration : currentDuration;
                }
                toneStartTime = input.runningTime();
                music.ringTone(parseInt(frequency));
                break;
            case "rest":
                if (tonebeat > 0)   // 等于0的时候放开就停止演奏
                    basic.pause(tonebeat * currentDuration - (input.runningTime() - toneStartTime) % tonebeat);
                music.rest(1);
                break;
            case "beat":
                tonebeat = parseInt(arg) >= 0 ? parseInt(arg) : tonebeat;
                break;
            case "dura":
                currentDuration = parseInt(arg) >= 0 ? parseInt(arg) : currentDuration;
                //basic.showNumber(currentDuration);
                break;
        }
    }


    //% blockId=knock_robot_neopixel_getLedPlots
    //% block="读取led5*5状态，按位组成一个整数返回"
    function getLedPlots(): number {
        let plots = 0;
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                plots = plots * 2;
                if (led.point(i, j)) {
                    plots += 1;
                }
            }
        }
        return plots;
    }

    function ledOnBoard(msg: string) {
        let cmd = msg.substr(0, 3);
        let arg = msg.substr(3, msg.length - 3);
        switch (cmd) {
            case "llp": // 读取板载led5*5状态
                bluetooth.uartWriteString("llp" + getLedPlots())
                break;
            case "slp":   // 设置板载led一点
                let x = parseInt(arg.substr(0, 1))
                let y = parseInt(arg.substr(1, 1))
                let b = arg.substr(2, 1)
                if (b == "1") {
                    led.plot(x, y); // 点亮
                }
                else {
                    led.unplot(x, y); // 关闭
                }
                bluetooth.uartWriteString("llp" + getLedPlots())
                break;
        }
    }

    // 处理用户自定义自动发送信息
    // function UsesDefinedMessage(arg: string) {
    //     // 2位ID，为了扩展，暂时其实只用到1位，不使用0，从1开始
    //     let id = parseInt(arg.substr(0, 2));
    //     if (id == 0 || id > UD_MAX_ID) return; // ID不合法，反馈
    //     let enable = parseInt(arg.substr(3, 1)); // 0 停止，1开始
    //     let timeout = parseInt(arg.substr(4, 4)); // 发送延迟，不能小于min
    //     UD_TIMEOUT[id - 1] = timeout > MIN_SEND_TIMEOUT ? timeout : MIN_SEND_TIMEOUT;
    //     UD_NEXTTIME[id - 1] = input.runningTime();

    //     UD_AUTO_SEND[id - 1] = enable == 1; // 设置自动发送
    // }


    // 板载pixel led？其实microbit不带，但大多数扩展带
    function showLed(arg: string) {
        //basic.showString(arg);
        if (strip == null || pixelCount == 0)
            return;

        if (arg[0] == '-') { // 返回pixel灯数量
            bluetooth.uartWriteString("pix" + pixelCount)
            return;
        }

        // 前6位rgb颜色，后面的是LED位置
        let ledstr = arg.substr(6, arg.length - 6);
        let rgb = parseInt("0x" + arg.substr(0, 6));
        let leds = splitString("|", ledstr);
        //basic.showNumber(leds.length);
        for (let i = 0; i < leds.length; i++) {
            strip.setPixelColor(parseInt(leds[i]), rgb);

        }
        strip.show();
    }

    //% blockId=knock_robot_neopixel_isBluetoothConnected
    //% block="是否已通过蓝牙连接"
    export function isBluetoothConnected(): boolean {
        return BluetoothConnected;
    }

    /**
     * Handles any incoming message
     */
    function handleIncomingUARTData(auto: boolean) {
        let msg = bluetooth.uartReadUntil(terminator)

        if (msg.length < 3) return;// 非法命令（以后再处理）
        let cmd = msg.substr(0, 3);
        let args = msg.substr(3, msg.length - 3);

        let handlerToExamine = CMD_HANDLERS;

        messageContainer.cmd = cmd;
        messageContainer.args = args;

        //analyzeCmd(cmd, arg);
        //messageContainer = arg;
        if (handlerToExamine == null) { //empty handler list
            //basic.showString("nohandler")
            if (auto) {   //handle message with auto handler
                handleMessage(cmd, args);
            }
        }
        else {
            let handled = false;

            while (handlerToExamine != null) {
                if (handlerToExamine.key == cmd) {
                    handlerToExamine.callback(messageContainer)
                    handled = true;
                }
                //2018-10-18新增
                //系统保留回显命令，用于输出敲比特发送过来的完整命令
                else if (handlerToExamine.key == "---") {
                    handlerToExamine.callback(messageContainer)
                    handled = true;
                }

                handlerToExamine = handlerToExamine.next
            }

            if (!handled && auto) {   //handle message with auto handler
                handleMessage(cmd, args);
            }
        }
    }
    /**
      * init microbit with robotbit and neopixel
      * @param id The id; eg: 1
    */
    //% blockId=knock_robot_neopixel_sendUserMessage
    //% block="发送用户消息 |id（0~9） %id | 消息（最大长度17） %msg"
    export function sendUserMessage(id: number, msg: string) {
        if (BluetoothConnected) {
            bluetooth.uartWriteString("ud" + (id % 10).toString() + msg.substr(0, 17));
        }
    }

    //% blockId=knock_robot_neopixel_sendSuperMessage
    //% block="发送超级消息 | 消息（最大长度20） %msg"
    export function sendSuperMessage(msg: string) {
        if (BluetoothConnected) {
            bluetooth.uartWriteString(msg.substr(0, 20));
        }
    }
    /**
      * init microbit with robotbit and neopixel
      * @param autoHandle auto handle message. eg: true
      * @param pixelCount the count of pixel. eg: 4
      */
    //% blockId=knock_robot_neopixel_init
    //% block="初始化 |自动处理消息 %autoHandle | 启用板载LED %robotled"
    export function init(autoHandle: boolean, pixelCount: number, pixelPort = DigitalPin.P16) {
        bluetooth.startUartService();
        bluetooth.onUartDataReceived(terminator, () => {
            handleIncomingUARTData(autoHandle);
            basic.pause(10);
        })

        bluetooth.onBluetoothConnected(() => {
            BluetoothConnected = true
            basic.showIcon(IconNames.Diamond)
            music.playTone(523, 50) // 调整音调，和前端演示代码一致
            music.playTone(698, 50)
            music.playTone(988, 50)
            basic.pause(10)
        })
        bluetooth.onBluetoothDisconnected(() => {
            BluetoothConnected = false
            basic.showIcon(IconNames.SmallDiamond)
            if (strip != null) {    // 断开蓝牙时关闭led灯
                for (let i = 0; i < pixelPort; i++)
                    strip.setPixelColor(i, 0);
                strip.show();
            }
            music.playTone(988, 50)
            music.playTone(698, 50)
            music.playTone(523, 50)
            basic.pause(10)
        })

        // 初始化完成，等待蓝牙连接
        basic.showLeds(`
                        . . # # .
                        # . # . #
                        . # # # .
                        # . # . #
                        . . # # .
                        `)
        if (pixelCount > 0) {
            strip = neopixel.create(pixelPort, pixelCount, NeoPixelMode.RGB);
            for (let i = 0; i < pixelPort; i++) // 初始化所有灯为关闭
                strip.setPixelColor(i, 0);
            strip.show();
        }
    }
}