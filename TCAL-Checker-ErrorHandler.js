console.log("TCAL-Checker-ErrorHandler.js loaded")


class TCErrorHandler {
    ErrorText = "";
    ErrorData;
    DisplayError (errortext, data) {
        if(errortext || data)
        {
            this.ErrorText = errortext;
            this.ErrorData = data ? data.message : null;
            console.log(this.ErrorText);
            if(Array.isArray(this.ErrorText))
            {
                this.ErrorText.forEach(element => {
                    const error = document.createElement("p");
                    error.textContent = element;
                    error.className = "errorLineArray";
                    document.getElementById("errorOutputBody").appendChild(error);
                })
            } else {
                const error = document.createElement("p");
                error.textContent = this.ErrorText;
                document.getElementById("errorOutputBody").appendChild(error);
            }

            if(this.ErrorText || this.ErrorData) this.ShowErrorWindow();
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