import {Utils} from "./Utils.js";

// each menu item has a 2 properties
// 1: the title
//    menu items that are always useable are just plain text
//    but it may be a callback function which:
//    a) sets the title using pMenuItem.innerHTML = "xyz"
//    b) arranges the visibility using pMenuItem.style.display = true/false
// 2: the callback function
//    called when the menu item is selected: (pClickEvent) => { ... }
// all menu items are re-validated when the menu pops up
// when all menu items are invisible, the menu-button must be made invisible
// since this can happen at any time, this cannot be done when the menu is shown
// worse, since the menu button may be invisible, thave event may never happen
// call (DropDownMenuInstance).verifyApp() to show/hide the menu button based
// on the visibility of its menu items. when all menu items are hidden, so is
// the menu. when at least one item is visible, the menu is visible
// remember to call verifyApp() when that is potentially the case

export class DropDownMenu {

  // Creates an empty dropdown menu
  // The visual clue for the menu is added to the given element
  constructor (pParentElement) {

    // allow reduced code on the caller side
    if (pParentElement.tagName === "TR") {
      const td = Utils.createTd();
      pParentElement.appendChild(td);
      pParentElement = td;
    }

    this.menuDropdown = Utils.createDiv("run-command-button");
    this.menuDropdown.classList.add("no-search");

    if (pParentElement.id === "cmd-box") {
      // D83D+DCD6 = 1F4D6 = A BOOK
      this.menuButton = Utils.createDiv("menu-dropdown", "\uD83D\uDCD6");
    } else if (pParentElement.classList && pParentElement.classList.contains("minion-output")) {
      // 2261 = MATHEMATICAL OPERATOR IDENTICAL TO (aka "hamburger")
      this.menuButton = Utils.createSpan("menu-dropdown", "\u2261");
    } else {
      // assume it will be a command menu
      // 2261 = MATHEMATICAL OPERATOR IDENTICAL TO (aka "hamburger")
      this.menuButton = Utils.createDiv("menu-dropdown", "\u2261");
    }

    // hide the menu until it receives menu-items
    this.verifyAll();

    this.menuDropdown.appendChild(this.menuButton);
    this.menuDropdownContent = Utils.createDiv("menu-dropdown-content");
    this.menuDropdown.appendChild(this.menuDropdownContent);
    this.menuDropdown.addEventListener("mouseenter", () => {
      this.verifyAll();
    });
    pParentElement.appendChild(this.menuDropdown);
  }

  verifyAll () {
    let visibleCount = 0;
    if (this.menuDropdownContent) {
      for (const chld of this.menuDropdownContent.children) {
        const verifyCallBack = chld.verifyCallBack;
        if (verifyCallBack) {
          const title = verifyCallBack(chld);
          if (title === null) {
            chld.style.display = "none";
            continue;
          }
          chld.innerHTML = DropDownMenu._sanitizeMenuItemTitle(title);
          chld.style.removeProperty("display");
        }
        visibleCount += 1;
      }
    }
    // hide the menu when it has no visible menu-items
    const displayVisible = this.menuDropdown.tagName === "TD" ? "table-cell" : "inline-block";
    const displayInvisible = "none";
    this.menuDropdown.style.display = visibleCount > 0 ? displayVisible : displayInvisible;
  }

  static _sanitizeMenuItemTitle (pTitle) {
    // 2011 = NON-BREAKING HYPHEN
    // 2026 = HORIZONTAL ELLIPSIS
    return pTitle.
      replace(" ", "&nbsp;").
      replace("-", "&#x2011;").
      replace("...", "&#x2026;");
  }

  // Add a menu item at the end of this dropdown menu
  // Runs the given callback function when selected
  // When the title is actually a function then this
  // function is called each time the menu opens
  // This allows dynamic menuitem titles (use menuitem.innerText/innerHTML)
  // or visibility (use menuitem.style.display = "none"/"inline-block")
  addMenuItem (pTitle, pCallBack, pValue) {
    const button = Utils.createDiv("run-command-button", "...");
    if (pValue) {
      button._value = pValue;
    }
    if (typeof pTitle === "string") {
      button.innerHTML = DropDownMenu._sanitizeMenuItemTitle(pTitle);
    } else {
      button.verifyCallBack = pTitle;
    }
    button.addEventListener("click", (pClickEvent) => {
      this._callback(pClickEvent, pCallBack, pValue);
    });
    this.menuDropdownContent.appendChild(button);
    this.verifyAll();
    return button;
  }

  _callback (pClickEvent, pCallBack, pValue) {
    this._value = pValue;
    pCallBack(pClickEvent);
    pClickEvent.stopPropagation();
  }

  setTitle (pTitle) {
    // Setting the title implies that we are interested
    // in the menu values, rather than their actions.
    // Use a slightly different clue for that.
    // 25BC = BLACK DOWN-POINTING TRIANGLE
    this.menuButton.innerHTML = DropDownMenu._sanitizeMenuItemTitle(pTitle + " \u25BC");
  }

  showMenu () {
    this.menuDropdown.style.display = "inline-block";
  }

  hideMenu () {
    this.menuDropdown.style.display = "none";
  }

}
