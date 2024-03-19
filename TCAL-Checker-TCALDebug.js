console.log("TCAL-Checker-TCALDebug.js loaded")


function DebugDataWorker(textArray, TCALData) {
    try {
        calDataFromDebugText(textArray, TCALData);
        plotTCALData(TCALData);
    } catch (err)
    {
        ErrorWindow.DisplayError(err);
        ErrorWindow.DisplayError(textArray);
    }
    printRawData(textArray, "debugRaw");
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