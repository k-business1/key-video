async function downloadFile(fileName) {

    const message = document.getElementById("message");
    message.textContent = "";

    try {

        const response = await fetch(fileName, {
            method: "HEAD"
        });

        if (response.ok) {

            const link = document.createElement("a");
            link.href = fileName;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } else {

            message.textContent = fileName + " is absent.";

        }

    } catch (error) {

        message.textContent = fileName + " is absent.";

    }

}
