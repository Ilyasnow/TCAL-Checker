console.log("TCAL-Checker-TCALPrint.js loaded")


function PrintDataWorker(textArray, TCALData) {
    try {
        ErrorWindow.DisplayLoading("Formatting basic data");
        calDataFromPrintText(textArray, TCALData);
        ErrorWindow.DisplayLoading("Displaying basic data");
        printTCALInfo(TCALData);
    } catch (err)
    {
        ErrorWindow.DisplayError(err);
        ErrorWindow.DisplayError(textArray);
    }
    printRawData(textArray, "printRaw");
    ErrorWindow.HideLoading();
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
        if(textArray[i].search(/\[.+\] \[\S+:(\d+)]/g) != -1 && currentIMUIndex != Number(/\[.+\] \[\S+:(\d+)]/g.exec(textArray[i])[1]))
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