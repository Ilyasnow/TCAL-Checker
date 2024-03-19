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

var ErrorWindow;
var testFileOutput;