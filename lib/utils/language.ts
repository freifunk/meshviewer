import moment from "moment";
import { getJSON } from "./http.js";
import Polyglot from "node-polyglot";
import { Router } from "./router.js";

export type LanguageCode = string;

export let _: Polyglot & { phrases?: Record<string, string> } = new Polyglot({
  phrases: {},
  allowMissing: true,
});

export const Language = function () {
  let router: Router;
  const config = window.config;

  function languageSelect(el: HTMLElement) {
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

  function setSelectLocale(event: Event) {
    const target = event.target as HTMLSelectElement;
    router.deepUrl({ lang: target.value });
  }

  function getLocale(input?: LanguageCode): LanguageCode {
    let language: LanguageCode = input || (navigator.languages && navigator.languages[0]) || navigator.language;
    const defaultLocale = config.supportedLocale[0];
    if (defaultLocale === undefined) {
      throw new Error("config.supportedLocale must contain at least one locale");
    }
    let locale = defaultLocale;
    config.supportedLocale.some(function (item: string) {
      if (language.indexOf(item) !== -1) {
        locale = item;
        return true;
      }
      return false;
    });
    return locale;
  }

  interface TranslationData {
    momentjs?: {
      calendar?: Record<string, string>;
      relativeTime?: Record<string, string>;
    };
    [k: string]: unknown;
  }

  function setTranslation(translationJson: TranslationData) {
    _.extend(translationJson as Record<string, string>);

    if (moment.locale(_.locale()) !== _.locale() && translationJson.momentjs) {
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

  function init(routing: Router) {
    router = routing;
    /** global: _ */
    _ = new Polyglot({ locale: getLocale(routing.getLang() ?? undefined), allowMissing: true });
    getJSON<TranslationData>("locale/" + _.locale() + ".json?" + config.cacheBreaker).then(setTranslation);
    document.querySelector("html")!.setAttribute("lang", _.locale());
  }

  return {
    init,
    getLocale,
    languageSelect,
  };
};
