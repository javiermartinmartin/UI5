sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend(

    "sap.ui.demo.walkthrough.Component",

    {
      metadata: {
        manifest: "json"
      },

      init: function () {
        UIComponent.prototype.init.apply(this, arguments);


        var oData = {
          recipient: {
            name: "world"
          }
        };
        var oModel = new JSONModel(oData);
        this.setModel(oModel);



      }
    });
});