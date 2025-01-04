function smUploadSetBackgroundImage(selector, url) {
    if (url == "") {
        $(selector)[0].style.backgroundImage = "";
    } else {
        $(selector)[0].style.backgroundImage = "url('" + url + "')";
    }
}