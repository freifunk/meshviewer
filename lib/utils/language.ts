import moment from "moment";
import * as helper from "./helper";
import Polyglot from "node-polyglot";
import Navigo from "navigo/lib/navigo.es";

export const Language = function () {
  let router: Navigo;
  let config = globalThis.config;

  function languageSelect(el) {
    let select = document.createElement("select");
    select.className = "language-switch";
    select.setAttribute("aria-label", "Language");
    select.addEventListener("change", setSelectLocale);
    el.appendChild(select);

    // Keep english
    select.innerHTML = "<option>Language</option>";
    for (let i = 0; i < config.supportedLocale.length; i++) {
      select.innerHTML +=
        '<option value="' + config.supportedLocale[i] + '">' + config.supportedLocale[i] + "</option>";
    }
  }

  function setSelectLocale(event) {
    router.fullUrl({ lang: event.target.value }, false, true);
  }

  function getLocale(input?: string) {
    let language = input || (navigator.languages && navigator.languages[0]) || navigator.language;
    let locale = config.supportedLocale[0];
    config.supportedLocale.some(function (item: string) {
      if (language.indexOf(item) !== -1) {
        locale = item;
        return true;
      }
      return false;
    });
    return locale;
  }

  function setTranslation(translationJson) {
    let _ = window._;
    _.extend(translationJson);

    if (moment.locale(_.locale()) !== _.locale()) {
      moment.defineLocale(_.locale(), {
        longDateFormat: {
          LT: "HH:mm",
          LTS: "HH:mm:ss",
          L: "DD.MM.YYYY",
          LL: "D. MMMM YYYY",
          LLL: "D. MMMM YYYY HH:mm",
          LLLL: "dddd, D. MMMM YYYY HH:mm",
        },
        calendar: translationJson.momentjs.calendar,
        relativeTime: translationJson.momentjs.relativeTime,
      });
    }
  }

  function init(routing: Navigo) {
    router = routing;
    /** global: _ */
    window._ = new Polyglot({ locale: getLocale(router.getLang()), allowMissing: true });
    let _ = window._;
    helper.getJSON("locale/" + _.locale() + ".json?" + config.cacheBreaker).then(setTranslation);
    document.querySelector("html").setAttribute("lang", _.locale());
  }

  return {
    init: init,
    getLocale: getLocale,
    languageSelect: languageSelect,
  };
};
