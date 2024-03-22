console.log("TCAL-Checker-ErrorHandler.js loaded")


class TCErrorHandler {
    ErrorText = "";
    ErrorData;
    DisplayError(errortext, data) {
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

    ShowErrorWindow() {
        document.getElementById("errorOutputHead").style.display = "block";
    }

    HideErrorWindow() {
        document.getElementById("errorOutputHead").style.display = "none";
    }

    ClearErrors() {
        this.ErrorText = "";
        this.ErrorData = undefined;
        document.getElementById("errorOutputBody").innerHTML = "";
        this.HideErrorWindow();
    }

    LoadingStatus = document.getElementById("loadingStatus");
    LoadingBar = document.getElementById("loadingBar");
    DisplayLoading(loadingText) {
        console.log(loadingText);
        this.LoadingStatus.textContent = loadingText;
        this.LoadingBar.style.display = "block";
        this.LoadingStatus.style.display = "block";
    }

    HideLoading() {
        this.LoadingStatus.textContent = '';
        this.LoadingStatus.style.display = "none";
        this.LoadingBar.style.display = "none";
    }
}