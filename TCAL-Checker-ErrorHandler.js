
// function CreateOutputWindow() {
//     // create a new div element
//     const newDiv = document.createElement("div");
  
//     // and give it some content
//     const newContent = document.createTextNode("Hi there and greetings!");
  
//     // add the text node to the newly created div
//     newDiv.appendChild(newContent);
  
//     // add the newly created element and its content into the DOM
//     const currentDiv = document.getElementById("errorOutputBody");
//     currentDiv.appendChild(newDiv)

//     document.getElementById("errorOutputHead").style.display = "block";
//   }
console.log("TCAL-Checker-ErrorHandler.js")

class TCErrorHandler {
    ErrorText = "";
    ErrorData;
    DisplayError (errortext, data) {
        if(errortext || data)
        {
            this.ErrorText = errortext;
            this.ErrorData = data ? data.message : null;
            var error = document.createElement("p");
            error.textContent = this.ErrorText
            document.getElementById("errorOutputBody").appendChild(error);

            if(this.ErrorText|| this.ErrorData) this.ShowErrorWindow();
        }
    }

    ShowErrorWindow () {
        document.getElementById("errorOutputHead").style.display = "block";
    }

    HideErrorWindow () {
        document.getElementById("errorOutputHead").style.display = "none";
    }

    ClearErrors() {
        ErrorText = "";
        ErrorData = undefined;
        document.getElementById("errorOutputBody").innerHTML = "";
    }
}