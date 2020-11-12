/* global config document window */

import {API} from "./Api.js";
import {BeaconsMinionPage} from "./pages/BeaconsMinion.js";
import {BeaconsPage} from "./pages/Beacons.js";
import {CommandBox} from "./CommandBox.js";
import {EventsPage} from "./pages/Events.js";
import {GrainsMinionPage} from "./pages/GrainsMinion.js";
import {GrainsPage} from "./pages/Grains.js";
import {JobPage} from "./pages/Job.js";
import {JobsPage} from "./pages/Jobs.js";
import {KeysPage} from "./pages/Keys.js";
import {LoginPage} from "./pages/Login.js";
import {MinionsPage} from "./pages/Minions.js";
import {OptionsPage} from "./pages/Options.js";
import {PillarsMinionPage} from "./pages/PillarsMinion.js";
import {PillarsPage} from "./pages/Pillars.js";
import {SchedulesMinionPage} from "./pages/SchedulesMinion.js";
import {SchedulesPage} from "./pages/Schedules.js";
import {TemplatesPage} from "./pages/Templates.js";
import {Utils} from "./Utils.js";

export class Router {

  constructor () {
    this.api = new API();
    this.commandbox = new CommandBox(this, this.api);
    this.currentPage = undefined;
    this.pages = [];

    this._registerPage(this.loginPage = new LoginPage(this));
    this._registerPage(this.minionsPage = new MinionsPage(this));
    this._registerPage(this.keysPage = new KeysPage(this));
    this._registerPage(this.grainsPage = new GrainsPage(this));
    this._registerPage(this.grainsMinionPage = new GrainsMinionPage(this));
    this._registerPage(this.schedulesPage = new SchedulesPage(this));
    this._registerPage(this.schedulesMinionPage = new SchedulesMinionPage(this));
    this._registerPage(this.pillarsPage = new PillarsPage(this));
    this._registerPage(this.pillarsMinionPage = new PillarsMinionPage(this));
    this._registerPage(this.beaconsPage = new BeaconsPage(this));
    this._registerPage(this.beaconsMinionPage = new BeaconsMinionPage(this));
    this._registerPage(this.jobPage = new JobPage(this));
    this._registerPage(this.jobsPage = new JobsPage(this));
    this._registerPage(this.templatesPage = new TemplatesPage(this));
    this._registerPage(this.eventsPage = new EventsPage(this));
    this._registerPage(this.optionsPage = new OptionsPage(this));

    // show template menu item if templates defined
    const templatesText = Utils.getStorageItem("session", "templates", "");
    if (templatesText) {
      const item1 = document.getElementById("button-templates1");
      item1.classList.remove("menu-item-hidden");
      const item2 = document.getElementById("button-templates2");
      item2.classList.remove("menu-item-hidden");
    }

    this._registerRouterEventListeners();

    Router.updateMainMenu();

    this.showPage(this.loginPage);
  }

  _registerRouterEventListeners () {
    document.getElementById("logo").
      addEventListener("click", () => {
        if (window.event.ctrlKey) {
          this.showPage(this.optionsRoute);
        } else {
          this.showPage(this.minionsRoute);
        }
      });

    document.getElementById("button-minions1").
      addEventListener("click", () => {
        this.showPage(this.minionsRoute);
      });
    document.getElementById("button-minions2").
      addEventListener("click", () => {
        this.showPage(this.minionsRoute);
      });

    document.getElementById("button-grains1").
      addEventListener("click", () => {
        this.showPage(this.grainsRoute);
      });
    document.getElementById("button-grains2").
      addEventListener("click", () => {
        this.showPage(this.grainsRoute);
      });

    document.getElementById("button-schedules1").
      addEventListener("click", () => {
        this.showPage(this.schedulesRoute);
      });
    document.getElementById("button-schedules2").
      addEventListener("click", () => {
        this.showPage(this.schedulesRoute);
      });

    document.getElementById("button-pillars1").
      addEventListener("click", () => {
        this.showPage(this.pillarsRoute);
      });
    document.getElementById("button-pillars2").
      addEventListener("click", () => {
        this.showPage(this.pillarsRoute);
      });

    document.getElementById("button-beacons1").
      addEventListener("click", () => {
        this.showPage(this.beaconsRoute);
      });
    document.getElementById("button-beacons2").
      addEventListener("click", () => {
        this.showPage(this.beaconsRoute);
      });

    document.getElementById("button-keys1").
      addEventListener("click", () => {
        this.showPage(this.keysRoute);
      });
    document.getElementById("button-keys2").
      addEventListener("click", () => {
        this.showPage(this.keysRoute);
      });

    document.getElementById("button-jobs1").
      addEventListener("click", () => {
        this.showPage(this.jobsRoute);
      });
    document.getElementById("button-jobs2").
      addEventListener("click", () => {
        this.showPage(this.jobsRoute);
      });

    document.getElementById("button-templates1").
      addEventListener("click", () => {
        this.showPage(this.templatesRoute);
      });
    document.getElementById("button-templates2").
      addEventListener("click", () => {
        this.showPage(this.templatesRoute);
      });

    document.getElementById("button-events1").
      addEventListener("click", () => {
        this.showPage(this.eventsRoute);
      });
    document.getElementById("button-events2").
      addEventListener("click", () => {
        this.showPage(this.eventsRoute);
      });

    document.getElementById("button-logout1").
      addEventListener("click", () => {
        this.api.logout().then(() => {
          this.showPage(this.loginRoute, {"reason": "logout"});
          return true;
        });
      });
    document.getElementById("button-logout2").
      addEventListener("click", () => {
        this.api.logout().then(() => {
          this.showPage(this.loginRoute, {"reason": "logout"});
          return false;
        });
      });

    // don't verify for invalid sessions too often
    // this happens only when the server was reset
    window.setInterval(() => {
      this._logoutTimer();
    }, 60000);

    // verify often for an expired session that we expect
    window.setInterval(() => {
      this._updateSessionTimeoutWarning();
    }, 1000);
  }

  _updateSessionTimeoutWarning () {
    const warning = document.getElementById("warning");

    const loginResponseStr = Utils.getStorageItem("session", "login-response", "{}");
    const loginResponse = JSON.parse(loginResponseStr);

    const expireValue = loginResponse.expire;
    if (!expireValue) {
      warning.style.display = "none";
      return;
    }

    const leftMillis = expireValue * 1000 - Date.now();

    if (leftMillis <= 0) {
      warning.style.display = "";
      warning.innerText = "Logout";
      // logout, and redirect to login screen
      this.api.logout().then(() => {
        this.showPage(this.loginRoute, {"reason": "expired-session"});
        return true;
      }, () => {
        this.showPage(this.loginRoute, {"reason": "expired-session"});
        return false;
      });
      return;
    }

    if (leftMillis > 60000) {
      // warn in the last minute
      warning.style.display = "none";
      warning.innerText = "";
      return;
    }

    warning.style.display = "";
    const left = new Date(leftMillis).toISOString();
    if (left.startsWith("1970-01-01T")) {
      // remove the date prefix and the millisecond suffix
      warning.innerText = "Session expires in " + left.substr(11, 8);
    } else {
      // stupid fallback
      warning.innerText = "Session expires in " + leftMillis + " milliseconds";
    }
  }

  _logoutTimer () {
    // are we logged in?
    const token = Utils.getStorageItem("session", "token");
    if (!token) {
      return;
    }

    // just a random lightweight api call
    const wheelConfigValuesPromise = this.api.getWheelConfigValues();
    // don't act in the callbacks
    // Api.apiRequest will do all the work
    wheelConfigValuesPromise.then(() => true, () => {
      this.api.logout().then(() => {
        this.showPage(this.loginRoute, {"reason": "no-session"});
        return false;
      });
    });
  }

  _registerPage (pPage) {
    this.pages.push(pPage);
    if (pPage.onRegister) {
      pPage.onRegister();
    }
  }

  static updateMainMenu () {
    // show template menu item if templates defined
    const templatesText = Utils.getStorageItem("session", "templates", "");
    if (templatesText) {
      const item1 = document.getElementById("button-templates1");
      item1.classList.remove("menu-item-hidden");
      const item2 = document.getElementById("button-templates2");
      item2.classList.remove("menu-item-hidden");
    }
  }

  goTo (pPath, hasPathPrefix = false) {
    if (this.switchingPage) {
      return;
    }
    if (window.location.pathname === config.NAV_URL + pPath && this.currentPage) {
      return;
    }
    if (pPath === "/" && Utils.getStorageItem("session", "login-response") === null) {
      // the fact that we don't have a session will be caught later
      // but this was shows less error messages on the console
      pPath = "/login";
    }
    const pathUrl = (hasPathPrefix ? "" : config.NAV_URL) + pPath.split("?")[0];
    for (const route of this.pages) {
      if (!route.path.test(pathUrl)) {
        continue;
      }
      // push history state for login (including redirect to /)
      if (pathUrl === config.NAV_URL + "/login" || pathUrl === config.NAV_URL + "/") {
        window.history.pushState({}, undefined, pPath);
      }
      this.showPage(route, { });
      return;
    }
    // route could not be found
    // just go to the main page
    this.goTo("/");
  }

  showPage (pPage, pParameters) {
    for (const key in pParameters) {
      window.sessionStorage.setItem(key, pParameters[key]);
    }

    pPage.pageElement.style.display = "";

    const minionMenuItem = document.getElementById("button-minions1");
    const jobsMenuItem = document.getElementById("button-jobs1");

    const activeMenuItems = Array.from(document.querySelectorAll(".menu-item-active"));
    activeMenuItems.forEach((menuItem) => {
      menuItem.classList.remove("menu-item-active");
    });

    const elem1 = pPage.menuItemElement1;
    if (elem1) {
      elem1.classList.add("menu-item-active");
      // activate also parent menu item if child element is selected
      if (elem1.id === "button-pillars1" ||
         elem1.id === "button-schedules1" ||
         elem1.id === "button-grains1" ||
         elem1.id === "button-beacons1") {
        const minionMenuItem = document.getElementById("button-minions1");
        minionMenuItem.classList.add("menu-item-active");
      }
      if (elem1.id === "button-jobs1" ||
         elem1.id === "button-templates1") {
        const jobsMenuItem = document.getElementById("button-jobs1");
        jobsMenuItem.classList.add("menu-item-active");
      }
    }

    const elem2 = pPage.menuItemElement2;
    if (elem2) {
      elem2.classList.add("menu-item-active");
    }

    this.switchingPage = true;

    pPage.onShow();

    // start the event-pipe (again)
    // it is either not started, or needs restarting
    API.getEvents(this);

    if (this.currentPage && pPage !== this.currentPage) {
      this._hideRoute(this.currentPage);
    }

    this.currentPage = pPage;
    this.currentPage.pageElement.classList.add("current");
    this.switchingPage = false;

    document.title = "SaltGUI - " + this.currentPage.name;
  }

  static _hidePage (pPage) {
    const page = pPage.pageElement;
    page.classList.remove("current");
    // 500ms matches the timeout in main.css (.route)
    window.setTimeout(() => {
      // Hide element after fade, so it does not expand the body
      page.style.display = "none";
    }, 500);
    if (pPage.onHide) {
      pPage.onHide();
    }
  }
}
