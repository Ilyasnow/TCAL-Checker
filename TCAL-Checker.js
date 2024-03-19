console.log("Loaded TCAL-Checker.is")

window.addEventListener("DOMContentLoaded", main);


function main(e){   
    ErrorWindow = new TCErrorHandler();
    if (!("serial" in navigator)) {
        ErrorWindow.DisplayError("Serial API is unsupported by your browser");
        document.getElementById('buttonSelectCOM').textContent = "Unsupported"
    }
    else {
        document.getElementById('buttonSelectCOM').addEventListener('click', SelectCOMPort);
    }

    document.getElementById('test-file-selector').addEventListener('input', FileSelect);
    document.getElementById('closeErrorOutput').addEventListener('click', ErrorWindow.HideErrorWindow);
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
        console.log(err.message);
        return 1;
        //ErrorWindow.DisplayError(err.message);
    }

    document.getElementById("loadingBar").style.display = "block";

    console.log(port);

    //TODO: Wait for boot to pass.
    await new Promise(r => setTimeout(r, 1000));

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

    console.log("finished");
    console.log(printTextArray);
    console.log(debugTextArray);
    printTextArray = ClearSerialOutput(printTextArray);
    debugTextArray = ClearSerialOutput(debugTextArray);
    
    writer.releaseLock();
    await port.close();

    document.getElementById("loadingBar").style.display = "none";

    PrintDataWorker(printTextArray, TCALData)
    DebugDataWorker(debugTextArray, TCALData)

}

async function readSerialArray(port) {
    var outputLine = "";
    var textArray = [];
    var reader = port.readable.getReader();
    var decoder = new TextDecoder();
    while(true) {
        const timeoutPromise = new Promise(((r, value, done) => setTimeout(r, 500, '', true)));
        const { value, done } = await Promise.race([reader.read(), timeoutPromise]);
        //console.log(done);
        if (done || done === undefined) {
            console.log("done");
            reader.releaseLock();
            break;
        }
        const out = decoder.decode(value);
        outputLine += out;
        if(outputLine.search(/(\n)/g) != -1)
        {
            var t = outputLine.split("\n");
            //console.log(t[0]);
            await textArray.push(t[0]);
            t.shift();
            outputLine = t.join();
        }
        
    }
    return textArray;
}

function ClearSerialOutput(textArray) {
    return textArray.filter((line) => {
        return line.search(/\[.*\] (\[SerialCommands\])/g) == -1;
    })
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
        var TCALData = [];

        var textArray = textOutput.split("\r\n");

        //clear output
        if(textArray[0] == 'tcal print')
        {
            PrintDataWorker(textArray, TCALData);
        }
        if(textArray[0] == 'tcal debug')
        {
            DebugDataWorker(textArray, TCALData);
        }
      })();
}