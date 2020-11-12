/* global document */

import {BeaconsPanel} from "./Beacons.js";
import {DropDownMenu} from "../DropDown.js";
import {Output} from "../output/Output.js";
import {Panel} from "./Panel.js";
import {Utils} from "../Utils.js";

export class BeaconsMinionPanel extends Panel {

  constructor () {
    super("beacons-minion");

    this.addTitle("Beacons on ...");
    this.addPanelMenu();
    this.addSearchButton();
    this.addPlayPauseButton("play");
    this.addHelpButton("The content of column 'Value' is automatically refreshed\nNote that some beacons produce multiple values, e.g. one per disk\nIn that case, effectively only one of the values is visible here");
    this.addCloseButton();
    this.addTable(["Name", "Config", "Value", "-val-", "-help-"]);
    this.setTableSortable("Name", "asc");
    this.setTableClickable();
    this.addMsg();
  }

  onShow () {
    const minionId = decodeURIComponent(Utils.getQueryParam("minionid"));

    // preliminary title
    this.updateTitle("Beacons on " + minionId);

    const localBeaconsListPromise = this.api.getLocalBeaconsList(minionId);

    localBeaconsListPromise.then((pLocalBeaconsListData) => {
      this._handleLocalBeaconsList(pLocalBeaconsListData, minionId);
      return true;
    }, (pLocalBeaconsListMsg) => {
      this._handleLocalBeaconsList(JSON.stringify(pLocalBeaconsListMsg), minionId);
      return false;
    });
  }

  updateFooter () {
    // update the footer
    const tbody = this.table.tBodies[0];
    let txt = Utils.txtZeroOneMany(tbody.rows.length,
      "No beacons", "{0} beacon", "{0} beacons");

    if (this.playOrPause === "pause") {
      // 23F5 = BLACK MEDIUM RIGHT-POINTING TRIANGLE (play)
      // FE0E = VARIATION SELECTOR-15 (render as text)
      txt += ", press '&#x23F5;&#xFE0E;' to continue";
    }

    this.setMsg(txt, true);
  }

  _handleLocalBeaconsList (pLocalBeaconsListData, pMinionId) {
    if (this.showErrorRowInstead(pLocalBeaconsListData)) {
      return;
    }

    const beacons0 = pLocalBeaconsListData.return[0][pMinionId];

    const beacons = BeaconsPanel.fixBeaconsMinion(beacons0);

    if (beacons && beacons.enabled === false) {
      this.updateTitle("Beacons on " + pMinionId + " (disabled)");
    }

    if (beacons === undefined) {
      this.setMsg("Unknown minion '" + pMinionId + "'");
      return;
    }
    if (beacons === false) {
      this.setMsg("Minion '" + pMinionId + "' did not answer");
      return;
    }

    this._addMenuItemBeaconsDisableWhenNeeded(pMinionId, beacons);
    this._addMenuItemBeaconsEnableWhenNeeded(pMinionId, beacons);
    this._addMenuItemBeaconsAdd(pMinionId);
    this._addMenuItemBeaconsReset(pMinionId);
    this._addMenuItemBeaconsSave(pMinionId);

    const keys = Object.keys(beacons.beacons).sort();
    for (const beaconName of keys) {
      const tr = document.createElement("tr");
      tr.id = "beacon-" + beaconName;

      const nameTd = Utils.createTd("beacon-name", beaconName);
      tr.appendChild(nameTd);

      const beacon = beacons.beacons[beaconName];

      // simplify the beacon information
      if ("name" in beacon) {
        delete beacon.name;
      }
      if (beacon.enabled === true) {
        delete beacon.enabled;
      }

      const beaconMenu = new DropDownMenu(tr);
      this._addMenuItemBeaconsDisableBeaconWhenNeeded(beaconMenu, pMinionId, beaconName, beacon);
      this._addMenuItemBeaconsEnableBeaconWhenNeeded(beaconMenu, pMinionId, beaconName, beacon);
      this._addMenuItemBeaconsDelete(beaconMenu, pMinionId, beaconName);

      // menu comes before this data on purpose
      const beaconConfig = Output.formatObject(beacon);
      const beaconConfigTd = Utils.createTd("beacon-config", beaconConfig);
      let initialValue = "";
      if (beacons.enabled === false) {
        beaconConfigTd.classList.add("beacon-disabled");
        initialValue += "\n(beacons disabled)";
      }
      if (beacon.enabled === false) {
        beaconConfigTd.classList.add("beacon-disabled");
        initialValue += "\n(beacon disabled)";
      }
      tr.appendChild(beaconConfigTd);

      if (initialValue === "") {
        initialValue = "(waiting)";
      }
      initialValue = initialValue.trim();
      const beaconValueTd = Utils.createTd("beacon-value", initialValue);
      beaconValueTd.classList.add("beacon-waiting");
      tr.appendChild(beaconValueTd);

      const tbody = this.table.tBodies[0];
      tbody.appendChild(tr);

      // run the command with the original beacon definition
      tr.addEventListener("click", (pClickEvent) => {
        const beacon0 = beacons0[beaconName];
        this.runCommand(pClickEvent, pMinionId, "beacons.modify " + beaconName + " " + JSON.stringify(beacon0));
      });

      const helpButtonTd = Utils.createTd("help-button");
      const helpButtonSpan = Utils.createSpan("nearly-visible-button", "", this.key + "-" + beaconName + "-help-button");
      // 2753 = BLACK QUESTION MARK ORNAMENT
      // FE0E = VARIATION SELECTOR-15 (render as text)
      helpButtonSpan.innerHTML = "&#x2753;&#xFE0E;";
      helpButtonSpan.style.display = "none";
      helpButtonSpan.style.cursor = "help";
      helpButtonTd.appendChild(helpButtonSpan);
      tr.helpButtonSpan = helpButtonSpan;
      tr.appendChild(helpButtonTd);
    }

    this.updateFooter();
  }

  _addMenuItemBeaconsDisableWhenNeeded (pMinionId, beacons) {
    if (beacons.enabled === false) {
      return;
    }
    this.panelMenu.addMenuItem("Disable beacons...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "beacons.disable");
    });
  }

  _addMenuItemBeaconsEnableWhenNeeded (pMinionId, beacons) {
    if (beacons.enabled !== false) {
      return;
    }
    this.panelMenu.addMenuItem("Enable beacons...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "beacons.enable");
    });
  }

  _addMenuItemBeaconsAdd (pMinionId) {
    this.panelMenu.addMenuItem("Add beacon...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "beacons.add <name> <data>");
    });
  }

  _addMenuItemBeaconsReset (pMinionId) {
    this.panelMenu.addMenuItem("Reset beacons...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "beacons.reset");
    });
  }

  _addMenuItemBeaconsSave (pMinionId) {
    this.panelMenu.addMenuItem("Save beacons...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "beacons.save");
    });
  }

  _addMenuItemBeaconsDisableBeaconWhenNeeded (pMenu, pMinionId, key, beacon) {
    if (beacon.enabled === false) {
      return;
    }
    pMenu.addMenuItem("Disable beacon...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "beacons.disable_beacon " + key);
    });
  }

  _addMenuItemBeaconsEnableBeaconWhenNeeded (pMenu, pMinionId, key, beacon) {
    if (beacon.enabled !== false) {
      return;
    }
    pMenu.addMenuItem("Enable beacon...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "beacons.enable_beacon " + key);
    });
  }

  _addMenuItemBeaconsDelete (pMenu, pMinionId, key) {
    pMenu.addMenuItem("Delete beacon...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "beacons.delete " + key);
    });
  }

  handleSaltBeaconEvent (pTag, pData) {
    if (this.playOrPause !== "play") {
      return;
    }

    const minionId = decodeURIComponent(Utils.getQueryParam("minionid"));
    const prefix = "salt/beacon/" + minionId + "/";
    if (!pTag.startsWith(prefix)) {
      return;
    }
    let beaconName = pTag.substring(prefix.length);
    beaconName = beaconName.replace(/[/].*/, "");

    const tr = document.getElementById("beacon-" + beaconName);
    if (tr === null) {
      // beacon was unknown when the screen was created
      return;
    }

    let txt = "";
    let stamp = "";
    if (pData["_stamp"]) {
      // keep timestamp for further logic
      stamp = pData["_stamp"];
      txt += Output.dateTimeStr(stamp) + "\n";
      delete pData["_stamp"];
    }
    if (pTag !== prefix + beaconName + "/") {
      // Show the tag when it has extra information
      txt += pTag + "\n";
    }
    if (pData["id"] === minionId) {
      delete pData["id"];
    }
    txt += Output.formatObject(pData);
    const td = tr.getElementsByTagName("td")[3];
    td.classList.remove("beacon-waiting");

    // round down to 0.1 second
    // secondary events are close, but rarely exact on the same time
    // original: yyyy-mm-ddThh:mm:ss.ssssss
    stamp = stamp.substr(0, 21);

    // when the warning-line has been shown, then from then on,
    // show an empty line when there is no warning.
    // this prevents a jumpy screen, while preserving space with
    // tags that are never affected.
    // See also: https://github.com/saltstack/salt/issues/57174
    let helpText = null;
    if (td.prevStamp && td.prevStamp !== stamp) {
      // event has a different timestamp
      // normal situation, no reason for panic
    } else if (td.prevTag && td.prevTag !== pTag) {
      helpText = "Multiple events seen with same timestamp, but different tag\nThis usually means that there is more data than can be seen here\nThere may e.g. be more than one disk or networkinterface\nBut only the most recently reported one is actually shown";
    } else if (td.prevData && td.prevData !== pData) {
      helpText = "Multiple events seen with same timestamp, same tag, but different data\nThis usually means that there is more data than can be seen here\nThere may e.g. be more than one disk or networkinterface\nBut only the most recently reported one is actually shown";
    } else {
      // duplicate of previous event, never mind for now
    }

    const searchBlock = this.div.querySelector(".search-box");
    Utils.hideShowTableSearchBar(searchBlock, this.table, "refresh");

    if (helpText) {
      Utils.addToolTip(tr.helpButtonSpan, helpText, "bottom-right");
      tr.helpButtonSpan.style.display = "";
    } else {
      tr.helpButtonSpan.style.display = "none";
    }

    td.innerText = txt;

    td.prevStamp = stamp;
    td.prevTag = pTag;
    td.prevData = pData;
  }
}
