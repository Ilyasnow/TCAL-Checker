
console.log("Loaded TCAL-Checker.is")

window.addEventListener("DOMContentLoaded", main);


var ErrorWindow;
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

/*TCALData structure:
[
    {
    -IMUIndex
    -IMUType
    -TCALSupported
    -TCALTRange
    -TCALDone
    -TCALDataPoints
        [
            {tempC, x, y, z},
        ]
    -TCALPolynomiials
        [
            {C, x, xx, xxx},
        ]
    },
]
*/
var TCALDataGlobal = [];

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

    //await new Promise(r => setTimeout(r, 500));

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
        const timeoutPromise = new Promise(((r, value, done) => setTimeout(r, 100, '', true)));
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

var testFileOutput;

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

function PrintDataWorker(textArray, TCALData) {
    try {
        calDataFromPrintText(textArray, TCALData);
        printTCALInfo(TCALData);
    } catch (err)
    {
        ErrorWindow.DisplayError(err);
        ErrorWindow.DisplayError(textArray);
    }
}

function DebugDataWorker(textArray, TCALData) {
    try {
        calDataFromDebugText(textArray, TCALData);
        plotTCALData(TCALData);
    } catch (err)
    {
        ErrorWindow.DisplayError(err);
        ErrorWindow.DisplayError(textArray);
    }
}

function calDataFromPrintText(textArray, TCALData) {
    console.log(textArray);
    var currentIMUIndex;
    var currentIMUType;
    var currentTCALSupported;
    var currentTCALTRange;
    var currentTCALTMin;
    var currentTCALTMax;
    var currentTCALDone;
    var currentArrayIndex = -1;
    for(var i=1; i < textArray.length;i++)
    {
        if(currentIMUIndex != Number(/\[.+\] \[\S+:(\d+)]/g.exec(textArray[i])[1]))
        {
            currentArrayIndex++;
            if(currentIMUIndex!==undefined)
            {
                if(TCALData[currentArrayIndex] === undefined)
                {
                    TCALData.push({
                        IMUIndex:currentIMUIndex,
                        IMUType:currentIMUType,
                        TCALSupported:currentTCALSupported,
                        TCALTRange:currentTCALTRange,
                        TCALDone:currentTCALDone
                    });
                }
                else
                {
                    TCALData[currentArrayIndex].TCALSupported = currentTCALSupported;
                    TCALData[currentArrayIndex].TCALTRange = currentTCALTRange,
                    TCALData[currentArrayIndex].TCALDone = currentTCALDone;
                }
                currentTCALSupported = undefined;
                currentTCALTRange = undefined;
                currentTCALTMin = undefined;
                currentTCALTMax = undefined;
                currentTCALDone = undefined;
            }
            currentIMUIndex = Number(/\[.+\] \[\S+:(\d+)]/g.exec(textArray[i])[1]);
            currentIMUType = /\[.+\] \[(\S+):/g.exec(textArray[i])[1];
        }
        if (textArray[i].search(/(Sensor \d+ temperature calibration state:)/g) != -1)
        {
            currentTCALSupported = true;
        }
        if (textArray[i].search(/(Temperature calibration not supported for )/g) != -1)
        {
            currentTCALSupported = false;
        }
        if (textArray[i].search(/(total range:)/g) != -1)
        {
            currentTCALTMin = Number(/min ?(\d+.?\d*) C/g.exec(textArray[i])[1]);
            currentTCALTMax = Number(/max ?(\d+.?\d*) C/g.exec(textArray[i])[1]);
            currentTCALTRange = [currentTCALTMin, currentTCALTMax];
        }
        if(currentTCALSupported && textArray[i].search(/(done:)/g) != -1)
        {
            currentTCALDone = Number(/done: ?(.+)/g.exec(textArray[i])[1]);
        }
    }
    if(TCALData[currentArrayIndex] === undefined)
    {
        TCALData.push({
            IMUIndex:currentIMUIndex,
            IMUType:currentIMUType,
            TCALSupported:currentTCALSupported,
            TCALTRange:currentTCALTRange,
            TCALDone:currentTCALDone
        });
    }
    else
    {
        TCALData[currentArrayIndex].TCALSupported = currentTCALSupported;
        TCALData[currentArrayIndex].TCALTRange = currentTCALTRange,
        TCALData[currentArrayIndex].TCALDone = currentTCALDone;
    }
    console.log(TCALData);
    TCALDataGlobal = TCALData;
}

function calDataFromDebugText (textArray, TCALData) {
    console.log(textArray);
    var flagDATA = 0;
    var currentIMUIndex;
    var currentIMUType;
    var currentTCALDataPoints;
    var currentTCALPolynomials;
    var currentArrayIndex = -1;
    for(var i=1; i < textArray.length;i++)
    {
        if(textArray[i] == "")
        {
            break;
        }
        switch(flagDATA)
        {
            //first entry setup
            case 0:
                flagDATA = 1;
                currentIMUIndex = Number(/\[.+\] \[\S+:(\d+)]/g.exec(textArray[i])[1]);
                currentIMUType = /\[.+\] \[(\S+):/g.exec(textArray[i])[1];
                currentTCALDataPoints = [];
                currentTCALPolynomials = [];
                break;
            //pre-data `tcal debug` information
            case 1:
                if (textArray[i].startsWith("[INFO ] ["+currentIMUType+":"+currentIMUIndex+"] DATA "+currentIMUIndex)) {
                    flagDATA = 2;
                }
                break;
            //tcal v1 recorded data
            case 2:
                if (textArray[i].startsWith("[INFO ] ["+currentIMUType+":"+currentIMUIndex+"] END "+currentIMUIndex)) {
                    flagDATA = 3;
                    break;
                }
                //Get datapoints
                var calT = Number(/(?:\S* ){3}(-?\d*\.\d*)/g.exec(textArray[i])[1]);
                var calX = Number(/(?:\S* ){4}(-?\d*\.\d*)/g.exec(textArray[i])[1]);
                var calY = Number(/(?:\S* ){5}(-?\d*\.\d*)/g.exec(textArray[i])[1]);
                var calZ = Number(/(?:\S* ){6}(-?\d*\.\d*)/g.exec(textArray[i])[1]);
                currentTCALDataPoints.push({tempC:calT, x:calX, y:calY, z:calZ});
                break;
            //tcal v2 polynomials
            case 3:
                //Go until IMU index changes
                if (currentIMUIndex != Number(/\[.+\] \[\S+:(\d+)]/g.exec(textArray[i])[1])) {
                    flagDATA = 0;
                    i--; //recheck the current line
                    if(TCALData[currentIMUIndex] === undefined)
                    {
                        TCALData.push({
                            IMUIndex:currentIMUIndex,
                            IMUType:currentIMUType,
                            TCALDataPoints:currentTCALDataPoints,
                            TCALPolynomials:currentTCALPolynomials,
                        });
                    }
                    else
                    {
                        TCALData[currentIMUIndex].TCALDataPoints = currentTCALDataPoints;
                        TCALData[currentIMUIndex].TCALPolynomials = currentTCALPolynomials;
                    }
                    currentIMUIndex = undefined;
                    currentIMUType = undefined;
                    currentTCALDataPoints = undefined;
                    currentTCALPolynomials = undefined;
                    break;
                }
                var polyC = Number(/(-?\d+\.\d+) /g.exec(textArray[i])[1]);
                var polyX = Number(/(-?\d+\.\d+)x\)/g.exec(textArray[i])[1]);
                var polyXX = Number(/(-?\d+\.\d+)xx\)/g.exec(textArray[i])[1]);
                var polyXXX = Number(/(-?\d+\.\d+)xxx\)/g.exec(textArray[i])[1]);
                currentTCALPolynomials.push({C:polyC, x:polyX, xx:polyXX, xxx:polyXXX});
                break;
        }
    }
    if(TCALData[currentIMUIndex] === undefined)
    {
        TCALData.push({
            IMUIndex:currentIMUIndex,
            IMUType:currentIMUType,
            TCALDataPoints:currentTCALDataPoints,
            TCALPolynomials:currentTCALPolynomials,
        });
    }
    else
    {
        TCALData[currentIMUIndex].TCALDataPoints = currentTCALDataPoints;
        TCALData[currentIMUIndex].TCALPolynomials = currentTCALPolynomials;
    }
    console.log(TCALData);
    TCALDataGlobal = TCALData
    return TCALData;
}

function plotTCALData (TCALData) {
    if(!TCALData)
    {
        ErrorWindow.DisplayError("No TCAL data detected");
        return 1;
    }
    var currentIndex = -1;
    TCALData.forEach((currentIMU) => 
    {
        currentIndex++;
        if(document.getElementById("plotterRow"+currentIndex))
        {
            document.getElementById("plotterRow"+currentIndex).remove();
        }
        if(currentIMU.TCALDataPoints == "" || currentIMU.TCALDataPoints == undefined) {
            if(currentIMU.TCALSupported)
            {
                var errmsg = currentIMU.IMUType+":"+currentIMU.IMUIndex+" - does not have TCAL data";
                ErrorWindow.DisplayError(errmsg);
            }
            return 1;
        }
        var plotterData = [];
        var pointsT = [];
        var pointsX = [];
        var pointsY = [];
        var pointsZ = [];
        
        currentIMU.TCALDataPoints.forEach((datapoint) =>
        {
            //if no datapoint (=0) then set values to `undefined` and approximate `tempC` from previous value +0.5
            if(datapoint.tempC == 0) {
                pointsT.push(parseFloat(pointsT.slice(-1))+parseFloat(0.5));
                pointsX.push(undefined);
                pointsY.push(undefined);
                pointsZ.push(undefined);
            } else {
                pointsT.push(datapoint.tempC);
                pointsX.push(datapoint.x);
                pointsY.push(datapoint.y);
                pointsZ.push(datapoint.z);
            }
        });
        var pointsXPoly = caclulatePolynomialArray(pointsT, currentIMU.TCALPolynomials[0]);
        var pointsYPoly = caclulatePolynomialArray(pointsT, currentIMU.TCALPolynomials[1]);
        var pointsZPoly = caclulatePolynomialArray(pointsT, currentIMU.TCALPolynomials[2]);

        var plotRow = document.createElement("tr");
        plotRow.className = "plotterRow";
        plotRow.id = "plotterRow"+currentIndex;
        //document.getElementById("dataTable").appendChild(plotRow);
        if(document.getElementById("infoRow"+currentIndex))
        {
            document.getElementById("infoRow"+currentIndex).insertAdjacentElement('afterend', plotRow);
        } else {
            document.getElementById("dataTable").appendChild(plotRow);
        }
        
        plotSingleGraph("X", pointsT, pointsX, pointsXPoly, plotRow);
        plotSingleGraph("Y", pointsT, pointsY, pointsYPoly, plotRow);
        plotSingleGraph("Z", pointsT, pointsZ, pointsZPoly, plotRow);        
    });

    // TODO: Display raw data
    // var rawDataButton = document.createElement("details");
    // document.getElementById("dataTable").appendChild(rawDataButton);
}

function plotSingleGraph(axis, arrayX, arrayY, arrayYPoly, element) {
    layout = {
        title:"TCAL "+axis,
        xaxis:{
            title: "Temperature",
            range: [Math.round(Math.min(...arrayX))-1, Math.round(Math.max(...arrayX))+2]
        },
        yaxis:{
            title: axis
        },
        showlegend: true,
        legend:{
            "orientation":"h",
            y:20
        },
        margin:{
            r:2,
            l:50
        },
    }
    var trace1 = {
        mode: 'markers',
        x:arrayX,
        y:arrayY,
        name:'TCALv1 gathered data'
    }
    var trace2 = {
        mode: 'lines',
        x:arrayX,
        y:arrayYPoly,
        name:'TCALv2 calculated curve'
    }
    var config = {
        responsive: true,
        scrollZoom: false,
        staticPlot: true,
        displayModeBar: false
    }

    var plot = document.createElement("td");
    plot.style.width = "33%";
    element.appendChild(plot);
    Plotly.newPlot(plot, [trace1, trace2], layout, config);
}

function caclulatePolynomialArray(Tvalues, polynomialValues) {
    var out = [];
    var C = polynomialValues["C"];
    var x = polynomialValues["x"];
    var xx = polynomialValues["xx"];
    var xxx = polynomialValues["xxx"];
    //console.log([C,x,xx,xxx]);
    Tvalues.forEach((point) => out.push(C + x*point + xx*point*point + xxx*point*point*point))
    return out;
}

function printTCALInfo(TCALData) {
    if(!TCALData)
    {
        ErrorWindow.DisplayError("No TCAL data detected");
        return 1;
    }

    var currentIndex = -1;
    TCALData.forEach((currentIMU) => 
    {
        currentIndex++;
        if(document.getElementById("infoRow"+currentIndex))
        {
            document.getElementById("infoRow"+currentIndex).remove();
        }

        var infoRow = document.createElement("tr");
        infoRow.className = "infoRow";
        infoRow.id = "infoRow"+currentIndex;
        //document.getElementById("plotterRow"+currentIMU).insertBefore(infoRow);
        //document.getElementById("dataTable").appendChild(infoRow);
        if(document.getElementById("plotterRow"+currentIndex))
        {
            document.getElementById("plotterRow"+currentIndex).insertAdjacentElement('beforeBegin', infoRow);
        } else {
            document.getElementById("dataTable").appendChild(infoRow);
        }

        var IMUHeader = document.createElement("h1");
        IMUHeader.textContent = "IMU "+currentIndex
        infoRow.appendChild(IMUHeader);

        var IMUIndex = document.createElement("p");
        IMUIndex.textContent = "IMU Index: "+currentIMU.IMUIndex;
        infoRow.appendChild(IMUIndex);

        var IMUType = document.createElement("p");
        IMUType.textContent = "IMU Type: "+currentIMU.IMUType;
        infoRow.appendChild(IMUType);

        var IMUSupported = document.createElement("p");
        IMUSupported.textContent = "TCAL Supported by IMU: "+currentIMU.TCALSupported;
        infoRow.appendChild(IMUSupported);

        
        if(currentIMU.TCALSupported)
        {
            var IMUTRange = document.createElement("p");
            IMUTRange.textContent = "TCAL Temperature Range (Expected): "+currentIMU.TCALTRange[0]+"C - "+currentIMU.TCALTRange[1]+" C";
            infoRow.appendChild(IMUTRange);
            
            var IMUDone = document.createElement("p");
            IMUDone.textContent = "TCAL Done: ";
            var IMUDoneSpan = document.createElement("span");
            IMUDoneSpan.textContent = currentIMU.TCALDone+"%";
            var gradientG = 20+(Math.round(220*(currentIMU.TCALDone/100)));
            var gradientR = 120+(Math.round(120*(1-currentIMU.TCALDone/100)));
            IMUDoneSpan.style.backgroundColor = "#"+gradientR.toString(16)+gradientG.toString(16)+"00";
            IMUDone.appendChild(IMUDoneSpan);
            infoRow.appendChild(IMUDone);
        }
    });
}