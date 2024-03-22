console.log("TCAL-Checker.is loaded")

window.addEventListener("DOMContentLoaded", main);


function main(e){   
    ErrorWindow = new TCErrorHandler();
    if (!("serial" in navigator)) {
        ErrorWindow.DisplayError("Serial API is unsupported by your browser");
        document.getElementById('buttonSelectCOM').textContent = "Unsupported"
        //Browser is firefox?
        if(typeof InstallTrigger !== 'undefined')
            ErrorWindow.DisplayError("Sadly, Firefox does not support Web Serial API. You can try Chrome, Edge or Opera instead");
    }
    else {
        document.getElementById('buttonSelectCOM').addEventListener('click', SelectCOMPort);
    }

    document.getElementById('test-file-selector').addEventListener('input', FileSelect);
    document.getElementById('closeErrorOutput').addEventListener('click', () => (ErrorWindow.ClearErrors()));
}

async function SelectCOMPort() {
    var port;
    var writer;
    var encoder = new TextEncoder();
    var TCALData = [];
    try{
        port = await navigator.serial.requestPort();
        await port.open({baudRate: 115200 });
    }
    catch (err)
    {
        if(err.name == "NotFoundError") return 1;
        ErrorWindow.DisplayError(err);
        return 1;
        //ErrorWindow.DisplayError(err.message);
    }

    if(port === undefined) {
        ErrorWindow.DisplayError("Failed to open the Serial port, please try again.");
        return 1;
    }

    //document.getElementById("loadingBar").style.display = "block";
    ErrorWindow.DisplayLoading("Waiting for port...")

    console.log(port);

    //TODO: Wait for boot to pass.
    //await new Promise(r => setTimeout(r, 1000));
    //<1000 cause 8266 sends . every second when it cannot connect to wifi
    console.log("waiting for clear serial");
    await waitForClearSerial(port, 700);
    
    ErrorWindow.DisplayLoading("Serial ready, gathering data...")

    console.log("sedning data");
    writer = port.writable.getWriter();
    const printDataArrayBuffer = encoder.encode("tcal print\n");
    writer.write(printDataArrayBuffer);

    var printTextArray = ["tcal print"];
    var readTextArray;
    readTextArray = await readSerialArray(port);
    printTextArray = printTextArray.concat(readTextArray);

    console.log("sedning data");
    const debugDataArrayBuffer = encoder.encode("tcal debug\n");
    writer.write(debugDataArrayBuffer);

    var debugTextArray = ["tcal debug"];
    readTextArray = await readSerialArray(port);
    debugTextArray = debugTextArray.concat(readTextArray);

    ErrorWindow.DisplayLoading("Data gathering complete!")
    console.log("finished");
    console.log(printTextArray);
    console.log(debugTextArray);
    printTextArray = ClearSerialOutput(printTextArray);
    debugTextArray = ClearSerialOutput(debugTextArray);
    
    writer.releaseLock();
    await port.close();

    ErrorWindow.HideLoading();
    document.getElementById("loadingBar").style.display = "none";

    PrintDataWorker(printTextArray, TCALData)
    DebugDataWorker(debugTextArray, TCALData)
}

async function waitForClearSerial(port, timeout)
{
    ErrorWindow.DisplayLoading("Waiting for Serial to clear up...");
    var reader = port.readable.getReader();
    while(true) {
        const timeoutPromise = new Promise(((r, value, done) => setTimeout(r, timeout, '', true)));
        const { value, done } = await Promise.race([reader.read(), timeoutPromise]);
        //console.log(done);
        if (done || done === undefined) {
            console.log("clear");
            reader.releaseLock();
            break;
        }
    }
}

async function readSerialArray(port) {
    var outputLine = "";
    var textArray = [];
    var reader = port.readable.getReader();
    var decoder = new TextDecoder();
    while(true) {
        const timeoutPromise = new Promise(((r, value, done) => setTimeout(r, 300, '', true)));
        const { value, done } = await Promise.race([reader.read(), timeoutPromise]);
        //console.log(done);
        if (done || done === undefined) {
            if(outputLine) textArray.push(outputLine);
            console.log("done");
            reader.releaseLock();
            break;
        }
        const out = decoder.decode(value);
        outputLine += out;
        if(outputLine.search(/(\n)/g) != -1)
        {
            var t = outputLine.split("\n");
            //await console.log(t);
            for(var i=0;i<t.length-1;i++)
            {
                textArray.push(t[i]);
            }
            outputLine = t[t.length-1];
        }
        
    }
    return textArray;
}

function ClearSerialOutput(textArray) {
    //remove leading and trailing whitespaces
    textArray = textArray.map((line) => {
        return line.trim();
    })
    //remove lines not including [sometext] or commands
    //keep only [text] [IMU:INDEX] formatted lines
    textArray = textArray.filter((line) => {
        return (line.search(/\[.+\] ?\[.+:\d+\]/g) != -1 || 
        line.search(/tcal print/gi) != -1 || 
        line.search(/tcal debug/gi) != -1);
    })
    // //remove [WiFiHandler] output
    // textArray = textArray.filter((line) => {
    //     return (line.search(/\[WiFiHandler\]/g) == -1 && line.search(/\[WiFiProvisioning\]/g) == -1  && line.search(/\[UDPConnection\]/g) == -1);
    // })
    // //remove periodic [SerialCommands] output
    // textArray = textArray.filter((line) => {
    //     return (line.search(/\[SerialCommands\]/g) == -1 && line.search(/\[NOTICE\]/g) == -1 );
    // })
    return textArray;
}

function ParseInputFile (textArray) {
    textArray = ClearSerialOutput(textArray);

    var printIndex;
    var debugIndex;
    var textArrayPrint;
    var textArrayDebug;
    var TCALData = [];
    console.log("textArray");
    console.log(textArray);
    for(var i=0; i<textArray.length; i++)
    {
        if(textArray[i] == "tcal print")
        {
            printIndex = i;
            continue;
        }
        if(textArray[i] == "tcal debug")
        {
            debugIndex = i;
            continue;
        }
    }

    if(printIndex != undefined && debugIndex != undefined ) {
        textArrayPrint = printIndex < debugIndex ? textArray.slice(printIndex,debugIndex) : textArray.slice(printIndex);
        textArrayDebug = debugIndex < printIndex ? textArray.slice(debugIndex,printIndex) : textArray.slice(debugIndex);
    } else if (printIndex != undefined ) {
        textArrayPrint = textArray.slice(printIndex);
    } else if (debugIndex != undefined ) {
        textArrayDebug = textArray.slice(debugIndex);
    }

    console.log(textArrayPrint);
    console.log(textArrayDebug);

    if(textArrayPrint)
        PrintDataWorker(textArrayPrint, TCALData);
    if(textArrayDebug)
        DebugDataWorker(textArrayDebug, TCALData);
    if(!textArrayPrint && !textArrayDebug) {
        ErrorWindow.DisplayError("No TCAL data detected");
        ErrorWindow.DisplayError(textArray);
    }
}

function FileSelect(e) {
    const file = document.getElementById('test-file-selector').files[0];
    (async () => {
        if(!file) {
            console.log("No file chosen");
            return 1;
        }
        const textOutput = await file.text();
        //console.log(textOutput);
        testFileOutput = textOutput;

        var textArray = textOutput.split("\r\n");

        ParseInputFile(textArray);
      })();
}

function printRawData(textArray, tag) {
    if(document.getElementById(tag)) document.getElementById(tag).remove();

    const details = document.createElement("details");
    details.className = "rawData";
    details.id = tag;

    const summary = document.createElement("summary");
    summary.textContent = "Raw Data";
    summary.style.cursor = "pointer";
    details.appendChild(summary);

    const div = document.createElement("div");
    div.className = "multiline";
    div.textContent = textArray.join("\n");
    details.appendChild(div);

    document.getElementById("rawData").appendChild(details);
}