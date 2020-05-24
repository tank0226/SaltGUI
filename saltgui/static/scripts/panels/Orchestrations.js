/* global document */

import {DropDownMenu} from "../DropDown.js";
import {Panel} from "./Panel.js";
import {Utils} from "../Utils.js";

export class OrchestrationsPanel extends Panel {

  constructor () {
    super("orchestrations");

    this.addTitle("Orchestrations");
    this.addSearchButton();
    this.addTable(["Name", "Description", "Target", "Command", "-menu-"]);
    this.setTableSortable("Name", "asc");
    this.addMsg();
  }

  onShow () {
    const runnerStateOrchestrateShowSlsPromise = this.router.api.getRunnerStateOrchestrateShowSls();

    runnerStateOrchestrateShowSlsPromise.then((pStateOrchestrateShowSlsData) => {
      this._handleOrchestrationsStateOrchestrateShowSls(pStateOrchestrateShowSlsData);
    }, (pStateOrchestrateShowSlsMsg) => {
      this._handleOrchestrationsStateOrchestrateShowSls(JSON.stringify(pStateOrchestrateShowSlsMsg));
    });
  }

  _handleOrchestrationsStateOrchestrateShowSls (pStateOrchestrateShowSlsData) {
    if (this.showErrorRowInstead(pStateOrchestrateShowSlsData)) {
      return;
    }

    // should we update it or just use from cache (see commandbox) ?
    let orchestrations = pStateOrchestrateShowSlsData.return[0];
    if (!orchestrations) {
      orchestrations = {"dummy": {}};
    }
    orchestrations = orchestrations[Object.keys(orchestrations)[0]];
    if (!orchestrations) {
      orchestrations = {};
    }
    Utils.setStorageItem("session", "orchestrations", JSON.stringify(orchestrations));
    const keys = Object.keys(orchestrations).sort();
    for (const key of keys) {
      const orchestration = orchestrations[key];
      this._addOrchestration(key, orchestration);
    }

    const msgDiv = document.getElementById("orchestrations-msg");
    const txt = Utils.txtZeroOneMany(keys.length,
      "No orchestrations", "{0} orchestration", "{0} orchestrations");
    msgDiv.innerText = txt;
  }

  _addOrchestration (pOrchestrationName, orchestration) {
    const tr = document.createElement("tr");

    tr.appendChild(Utils.createTd("name", pOrchestrationName));

    // calculate description
    const description = orchestration["description"];
    if (description) {
      tr.appendChild(Utils.createTd("description", description));
    } else {
      tr.appendChild(Utils.createTd("description value-none", "(none)"));
    }

    // calculate targettype
    const targetType = orchestration["targettype"];
    // calculate target
    const target = orchestration["target"];
    if (!targetType && !target) {
      tr.appendChild(Utils.createTd("target value-none", "(none)"));
    } else if (!target) {
      // targetType cannot be null here
      tr.appendChild(Utils.createTd("target", targetType));
    } else if (targetType) {
      // targetcannot be null here
      tr.appendChild(Utils.createTd("target", targetType + " " + target));
    } else {
      tr.appendChild(Utils.createTd("target", target));
    }

    // calculate command
    const command = orchestration["command"];
    if (command) {
      tr.appendChild(Utils.createTd("command", command));
    } else {
      tr.appendChild(Utils.createTd("command value-none", "(none)"));
    }

    const menu = new DropDownMenu(tr);
    this._addMenuItemApplyOrchestration(menu, pOrchestrationName);
    this._addMenuItemApplyOrchestrationTest(menu, pOrchestrationName);

    this.table.tBodies[0].appendChild(tr);

    tr.addEventListener("click", (pClickEvent) => {
      this.runFullCommand(pClickEvent, "", "", "runners.state.orchestrate " + pOrchestrationName);
    });
  }

  _addMenuItemApplyOrchestration (pMenu, pOrchestrationName) {
    pMenu.addMenuItem("Apply&nbsp;orchestration...", (pClickEvent) => {
      this.runFullCommand(pClickEvent, "", "", "runners.state.orchestrate " + pOrchestrationName);
    });
  }

  _addMenuItemApplyOrchestrationTest (pMenu, pOrchestrationName) {
    pMenu.addMenuItem("Test&nbsp;orchestration...", (pClickEvent) => {
      this.runFullCommand(pClickEvent, "", "", "runners.state.orchestrate test=true " + pOrchestrationName);
    });
  }
}
