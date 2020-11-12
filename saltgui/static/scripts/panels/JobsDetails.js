/* global config document window */

import {DropDownMenu} from "../DropDown.js";
import {JobPanel} from "./Job.js";
import {JobsPanel} from "./Jobs.js";
import {Output} from "../output/Output.js";
import {TargetType} from "../TargetType.js";
import {Utils} from "../Utils.js";

export class JobsDetailsPanel extends JobsPanel {

  constructor () {
    super("jobs");

    this.addTitle("Recent Jobs");
    this.addPanelMenu();
    this._addMenuItemShowSome();
    this._addMenuItemShowEligible();
    this._addMenuItemShowAll();
    this.addSearchButton();
    this.addPlayPauseButton("play");
    this.addTable(["JID", "Target", "Function", "Start Time", "-menu-", "Status", "Details"], "data-list-jobs");
    this.setTableSortable("JID", "desc");
    this.setTableClickable();
    this.addMsg();
  }

  onShow () {
    const patInteger = /^(?:(?:0)|(?:[-+]?[1-9][0-9]*))$/;

    const maxJobs = 50;
    let cnt = decodeURIComponent(Utils.getQueryParam("cnt", String(maxJobs)));
    if (cnt === "eligible") {
      cnt = 10000;
    } else if (cnt === "all") {
      // magic value to ignore all filters
      cnt = 99999;
    } else if (cnt.match(patInteger)) {
      cnt = parseInt(cnt, 10);
    } else {
      // pretend parameter was not present
      cnt = maxJobs;
    }
    this.panelMenu._value = cnt;

    super.onShow(cnt);

    // to update details
    // interval should be larger than the retrieval time
    // to prevent many of such jobs to appear
    window.setInterval(() => {
      this._updateNextJob();
    }, 1000);
  }

  _addMenuItemShowSome () {
    const maxJobs = 50;
    let title = "Show first " + maxJobs + " jobs";
    const cnt = decodeURIComponent(Utils.getQueryParam("cnt"));
    if (cnt === "undefined" || cnt === String(maxJobs)) {
      // 25CF = BLACK CIRCLE
      title = "\u25CF " + title;
    }
    this.panelMenu.addMenuItem(title, () => {
      window.location.assign(config.NAV_URL + "/jobs?cnt=" + maxJobs);
    });
  }

  _addMenuItemShowEligible () {
    const cnt = decodeURIComponent(Utils.getQueryParam("cnt"));
    let title = "Show eligible jobs";
    if (cnt === "eligible") {
      // 25CF = BLACK CIRCLE
      title = "\u25CF " + title;
    }
    this.panelMenu.addMenuItem(title, () => {
      window.location.assign(config.NAV_URL + "/jobs?cnt=eligible");
    });
  }

  _addMenuItemShowAll () {
    const cnt = decodeURIComponent(Utils.getQueryParam("cnt"));
    let title = "Show all jobs";
    if (cnt === "all") {
      // 25CF = BLACK CIRCLE
      title = "\u25CF " + title;
    }
    this.panelMenu.addMenuItem(title, () => {
      window.location.assign(config.NAV_URL + "/jobs?cnt=all");
    });
  }

  static _isInsideViewPort (pElement) {
    const rect = pElement.getBoundingClientRect();
    if (rect.bottom < 0) {
      return false;
    }
    if (rect.right < 0) {
      return false;
    }
    if (rect.top >= (window.innerHeight || document.documentElement.clientHeight)) {
      return false;
    }
    if (rect.left >= (window.innerWidth || document.documentElement.clientWidth)) {
      return false;
    }
    return true;
  }

  _updateNextJob () {

    // user can decide
    // system can decide to remove the play/pause button
    if (this.playOrPause !== "play") {
      return;
    }

    const tbody = this.table.tBodies[0];
    // find an item still marked as "(click)"
    // but when we find 3 "loading..." items, the system is
    // probably overloaded and we skip a cycle
    let cntLoading = 0;
    let workLeft = false;
    for (const tr of tbody.rows) {
      const detailsField = tr.querySelector("td.details span");
      if (!detailsField) {
        continue;
      }
      if (detailsField.innerText === "loading...") {
        cntLoading += 1;
        if (cntLoading >= 3) {
          // too many already running
          return;
        }
        continue;
      }
      if (detailsField.innerText !== "(click)") {
        continue;
      }
      if (!JobsDetailsPanel._isInsideViewPort(tr)) {
        workLeft = true;
        continue;
      }
      detailsField.classList.add("no-job-details");
      detailsField.innerText = "loading...";
      const jobId = tr.dataset.jobid;
      this._getJobDetails(jobId);
      // only update one item at a time
      return;
    }
    if (!workLeft) {
      this.playOrPause = "";
      this.playButton.style.display = "none";
      this.pauseButton.style.display = "none";
      this.updateFooter();
    }
  }

  _getJobDetails (pJobId) {
    const runnerJobsListJobPromise = this.api.getRunnerJobsListJob(pJobId);

    runnerJobsListJobPromise.then((pRunnerJobsListJobData) => {
      this._handleJobsRunnerJobsListJob(pJobId, pRunnerJobsListJobData);
      return true;
    }, (pRunnerJobsListJobMsg) => {
      this._handleJobsRunnerJobsListJob(pJobId, JSON.stringify(pRunnerJobsListJobMsg));
      return false;
    });
  }

  _handleJobsRunnerJobsListJob (pJobId, pData) {

    const jobTr = this.table.querySelector("#" + Utils.getIdFromJobId(pJobId));
    if (!jobTr) {
      return;
    }
    // don't process this one again
    delete jobTr.dataset.detailsUnknown;

    const detailsSpan = jobTr.querySelector("td.details span");
    if (!detailsSpan) {
      return;
    }

    if (typeof pData !== "object") {
      detailsSpan.innerText = "(error)";
      detailsSpan.classList.remove("no-job-details");
      Utils.addToolTip(detailsSpan, pData);
      return;
    }

    pData = pData.return[0];

    if (pData.Error) {
      // typically happens for jobs that are expired from jobs-cache
      detailsSpan.innerText = "(error)";
      detailsSpan.classList.remove("no-job-details");
      Utils.addToolTip(detailsSpan, pData.Error);
      return;
    }

    if (!pData.Minions) {
      // We've seen cases where this part is missing
      pData.Minions = [];
    }

    let detailsHTML = Utils.txtZeroOneMany(pData.Minions.length,
      "no minions", "{0} minion", "{0} minions");

    const keyCount = Object.keys(pData.Result).length;
    detailsHTML += ", ";
    if (keyCount === pData.Minions.length) {
      detailsHTML += "<span style='color: green'>";
    } else {
      detailsHTML += "<span style='color: red'>";
    }
    detailsHTML += Utils.txtZeroOneMany(keyCount,
      "no results", "{0} result", "{0} results");
    detailsHTML += "</span>";

    const summary = {};
    for (const minionId in pData.Result) {
      const result = pData.Result[minionId];
      // use keys that can conveniently be sorted
      const key = (result.success ? "0-" : "1-") + result.retcode;
      if (summary[key] === undefined) {
        summary[key] = 0;
      }
      summary[key] += 1;
    }

    const keys = Object.keys(summary).sort();
    for (const key of keys) {
      detailsHTML += ", ";
      if (key === "0-0") {
        detailsHTML += "<span style='color: green'>";
        detailsHTML += Utils.txtZeroOneMany(summary[key], "", "{0} success", "{0} successes");
      } else if (key.startsWith("0-")) {
        detailsHTML += "<span style='color: orange'>";
        detailsHTML += Utils.txtZeroOneMany(summary[key], "", "{0} success", "{0} successes");
      } else {
        // if (key.startsWith("1-"))
        detailsHTML += "<span style='color: red'>";
        detailsHTML += Utils.txtZeroOneMany(summary[key], "", "{0} failure", "{0} failures");
      }
      if (key !== "0-0") {
        // don't show the retcode for real success
        detailsHTML += "(" + key.substr(2) + ")";
      }
      detailsHTML += "</span>";
    }

    detailsSpan.innerText = "";
    detailsSpan.appendChild(Utils.createJobStatusSpan(pJobId));
    const statusSpan = Utils.createSpan();
    statusSpan.innerHTML = detailsHTML;
    detailsSpan.appendChild(statusSpan);
    detailsSpan.classList.remove("no-job-details");
    Utils.addToolTip(detailsSpan, "Click to refresh");
  }

  addJob (job) {
    const tr = document.createElement("tr");
    tr.id = Utils.getIdFromJobId(job.id);
    tr.dataset.jobid = job.id;
    tr.appendChild(Utils.createTd("", job.id));

    let targetText = TargetType.makeTargetText(job);
    const maxTextLength = 50;
    if (targetText.length > maxTextLength) {
      // prevent column becoming too wide
      targetText = targetText.substring(0, maxTextLength) + "...";
    }
    tr.appendChild(Utils.createTd("target", targetText));

    const argumentsText = JobPanel.decodeArgumentsText(job.Arguments);
    let functionText = job.Function + argumentsText;
    if (functionText.length > maxTextLength) {
      // prevent column becoming too wide
      functionText = functionText.substring(0, maxTextLength) + "...";
    }
    tr.appendChild(Utils.createTd("function", functionText));

    const startTimeText = Output.dateTimeStr(job.StartTime);
    tr.appendChild(Utils.createTd("starttime", startTimeText));

    const menu = new DropDownMenu(tr);
    JobsDetailsPanel._addJobsMenuItemShowDetails(menu, job);
    this._addMenuItemJobsRerunJob(menu, job, argumentsText);

    const statusTd = Utils.createTd();
    const statusSpan = Utils.createSpan("job-status", "loading...");
    statusSpan.classList.add("no-job-status");
    statusSpan.addEventListener("click", (pClickEvent) => {
      // show "loading..." only once, but we are updating the whole column
      statusSpan.classList.add("no-job-status");
      statusSpan.innerText = "loading...";
      this.startRunningJobs();
      pClickEvent.stopPropagation();
    });
    statusTd.appendChild(statusSpan);
    tr.appendChild(statusTd);

    this._addJobsMenuItemUpdateStatus(menu, statusSpan);

    tr.dataset.detailsUnknown = "true";
    const detailsTd = Utils.createTd("details");
    const detailsSpan = Utils.createSpan("details2", "(click)");
    detailsSpan.classList.add("no-job-details");
    detailsSpan.addEventListener("click", (pClickEvent) => {
      detailsSpan.classList.add("no-job-details");
      detailsSpan.innerText = "loading...";
      this._getJobDetails(job.id);
      pClickEvent.stopPropagation();
    });
    Utils.addToolTip(detailsSpan, "Click to refresh");
    detailsTd.appendChild(detailsSpan);
    tr.appendChild(detailsTd);

    this._addMenuItemUpdateDetails(menu, detailsSpan, job);

    // fill out the number of columns to that of the header
    while (tr.cells.length < this.table.tHead.rows[0].cells.length) {
      tr.appendChild(Utils.createTd());
    }

    const tbody = this.table.tBodies[0];
    tbody.appendChild(tr);

    tr.addEventListener("click", () => {
      window.location.assign(config.NAV_URL + "/job?id=" + encodeURIComponent(job.id));
    });
  }

  static _addJobsMenuItemShowDetails (pMenu, job) {
    pMenu.addMenuItem("Show details", () => {
      window.location.assign(config.NAV_URL + "/job?id=" + encodeURIComponent(job.id));
    });
  }

  _addMenuItemJobsRerunJob (pMenu, job, argumentsText) {
    pMenu.addMenuItem("Re-run job...", (pClickEvent) => {
      this.runFullCommand(pClickEvent, job["Target-type"], job.Target, job.Function + argumentsText);
    });
  }

  _addJobsMenuItemUpdateStatus (pMenu, pStatusSpan) {
    pMenu.addMenuItem("Update status", () => {
      pStatusSpan.classList.add("no-job-status");
      pStatusSpan.innerText = "loading...";
      this.startRunningJobs();
    });
  }

  _addMenuItemUpdateDetails (pMenu, pDetailsSpan, job) {
    pMenu.addMenuItem("Update details", () => {
      pDetailsSpan.classList.add("no-job-details");
      pDetailsSpan.innerText = "loading...";
      this._getJobDetails(job.id);
    });
  }
}
