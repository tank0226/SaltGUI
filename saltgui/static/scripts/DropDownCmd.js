import {DropDownMenu} from "./DropDown.js";

export class DropDownMenuCmd extends DropDownMenu {
  // constructor (pParentElement) {
  //   super(pParentElement);
  // }

  _selectCallback (pMenuItem, pTitle) {
    // show the chosen value
    if (typeof pTitle !== "string") {
      pTitle = pTitle(pMenuItem);
    }
    this.setTitle(pTitle);
  }

  addMenuItemCmd (pTitle, pCallback) {
    const menuItem = super.addMenuItem(pTitle, (pMenuItem) => {
      this._selectCallback(pMenuItem, pTitle);
    }, (pMenuItem) => {
console.log("pMenuItem", pMenuItem, "pCallback", pCallback);
      pCallback(pMenuItem);
    });
    return menuItem;
  }
}
