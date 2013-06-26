// All other modules are started here with the call to CORE.start_all()


(function GetMap() {
    Microsoft.Maps.loadModule('Microsoft.Maps.Themes.BingTheme', { callback: themesModuleLoaded });
})();

function themesModuleLoaded() {
    map = new Microsoft.Maps.Map(document.getElementById('myMap'),
   {
       credentials: 'Ajr-eB1TUBaAE6jBFPwwGTykOteRcsFkzfwyI7OdWEWPxKTyTQrAoitRmo39vgUU',
       center: new Microsoft.Maps.Location(37.777119, -122.41964),
       showMapTypeSelector: false,
       enableSearchLogo: false,
       zoom: 12,
       theme: new Microsoft.Maps.Themes.BingTheme()
   });

    var spinnerhtml = document.getElementById("spinner_html").innerHTML;

    CORE.add_global({ key: 'map', value: map });
    CORE.add_global({ key: 'spinner_html', value: spinnerhtml });
    CORE.add_global({ key: 'api_key', value: "Ajr-eB1TUBaAE6jBFPwwGTykOteRcsFkzfwyI7OdWEWPxKTyTQrAoitRmo39vgUU" });
    CORE.start_all();
    CORE.debug(true);
}