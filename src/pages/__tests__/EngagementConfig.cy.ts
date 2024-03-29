import { configApiPath } from "src/global"
import {
  engagementCommonConfigSchema,
  engagementPartnerConfigSchema,
} from "src/schemas"
import { useUserFacingLayoutStore } from "src/stores/user-facing-layout"

import EngagementConfig from "../EngagementConfig.vue"

import type { CyHttpMessages } from "cypress/types/net-stubbing"
import type { SinonStub } from "cypress/types/sinon"

const mountComponent = ({ zone = "_" } = {}) => {
  cy.mount(EngagementConfig, {
    props: {
      zone,
    },
  })
}

describe("EngagementConfig", () => {
  beforeEach(() => {
    cy.intercept(`${configApiPath}/*`, {})
    cy.stub(engagementCommonConfigSchema, "parseAsync")
      .as("common-config-parse-stub")
      .resolves({
        partnerGroups: {
          _: ["_", "_"],
        },
        shiftStartTimes: [""],
        weekStart: {
          day: "Monday",
          shiftIndex: 0,
        },
      })
    cy.stub(engagementPartnerConfigSchema, "parseAsync")
      .as("partner-config-parse-stub")
      .resolves({
        title: "",
        shiftEngaged: [true, false],
        targetCycleTime: 60,
        targetEfficiency: 1,
      })
  })

  it("sets the title extension in the layout store", () => {
    mountComponent()

    cy.wrap(useUserFacingLayoutStore())
      .its("titleExtension")
      .should("equal", "Lines Engagement")
  })

  it("requests the configuration API for common data", () => {
    cy.intercept(
      `${configApiPath}/common`,
      cy
        .stub()
        .as("response-stub")
        .callsFake((req: CyHttpMessages.IncomingHttpRequest) => {
          req.reply({})
        }),
    )

    mountComponent()

    cy.get("@response-stub").should("have.been.calledOnce")
  })

  it("validates the common configuration against the schema", () => {
    const data = { commonConfigSentinel: "value" }

    cy.intercept(`${configApiPath}/common`, data)

    mountComponent()

    cy.get("@common-config-parse-stub").should("have.been.calledOnceWith", data)
  })

  it("builds the heading line from common configuration data", () => {
    cy.get<SinonStub>("@common-config-parse-stub").invoke("resolves", {
      partnerGroups: {
        _: [],
      },
      shiftStartTimes: ["a", "b", "c"],
      weekStart: {
        day: "Wednesday",
        shiftIndex: 1,
      },
    })

    mountComponent()

    cy.dataCy("header-cell")
      .invoke("text")
      .should(
        "equal",
        "bcWed\nabcThu\nabcFri\nabcSat\nabcSun\nabcMon\nabcTue\na",
      )
  })

  it("requests the configuration API for partners data", () => {
    cy.get<SinonStub>("@common-config-parse-stub").invoke("resolves", {
      partnerGroups: {
        aZone: ["efgh", "ijkl"],
        mockedZone: ["abcd", "efgh"],
      },
      shiftStartTimes: [],
      weekStart: {
        day: "",
        shiftIndex: 0,
      },
    })
    cy.intercept(
      `${configApiPath}/@(abcd|efgh)`,
      cy
        .stub()
        .as("response-stub")
        .callsFake((req: CyHttpMessages.IncomingHttpRequest) => {
          req.reply({})
        }),
    )

    mountComponent({ zone: "mockedZone" })

    cy.get("@response-stub")
      .should("have.been.calledTwice")
      .and(
        "have.been.calledWith",
        Cypress.sinon.match({ url: Cypress.sinon.match(/abcd$/) }),
      )
      .and(
        "have.been.calledWith",
        Cypress.sinon.match({ url: Cypress.sinon.match(/efgh$/) }),
      )
  })

  it("validates the partners configuration against schema", () => {
    cy.get<SinonStub>("@common-config-parse-stub").invoke("resolves", {
      partnerGroups: {
        aZone: ["mnop", "qrst"],
      },
      shiftStartTimes: [],
      weekStart: {
        day: "",
        shiftIndex: 0,
      },
    })
    const firstSentinel = { key: "firstValue" }
    const secondSentinel = { key: "secondValue" }
    cy.intercept(`${configApiPath}/mnop`, firstSentinel)
    cy.intercept(`${configApiPath}/qrst`, secondSentinel)

    mountComponent({ zone: "aZone" })

    cy.get("@partner-config-parse-stub")
      .should("have.been.calledTwice")
      .and("have.been.calledWith", firstSentinel)
      .and("have.been.calledWith", secondSentinel)
  })

  it("builds the tables contents from partners configuration data", () => {
    cy.get<SinonStub>("@partner-config-parse-stub").then((stub) => {
      stub
        .onFirstCall()
        .resolves({
          title: "stubbedFirst",
          shiftEngaged: (() => {
            const data = new Array(21).fill(false)
            data[3] = true
            data[11] = true
            data[20] = true
            return data
          })(),
          targetCycleTime: 12.3,
          targetEfficiency: 0.456,
        })
        .onSecondCall()
        .resolves({
          title: "stubbedSecond",
          shiftEngaged: (() => {
            const data = new Array(21).fill(false)
            data[6] = true
            data[15] = true
            return data
          })(),
          targetCycleTime: 34.5,
          targetEfficiency: 0.678,
        })
    })

    mountComponent()

    cy.dataCy("capacity-table-row-header")
      .invoke("text")
      .should("equal", "stubbedFirststubbedSecond")
    cy.dataCy("cycle-time-input").should(($elems) => {
      expect($elems[0]).to.have.value("12.3")
      expect($elems[1]).to.have.value("34.5")
    })
    cy.dataCy("efficiency-input").should(($elems) => {
      expect($elems[0]).to.have.value("45.6")
      expect($elems[1]).to.have.value("67.8")
    })

    cy.dataCy("engagement-row-title")
      .invoke("text")
      .should("equal", "stubbedFirststubbedSecond")
    cy.dataCy("checkbox")
      .filter("[aria-checked='true']")
      .should("have.length", 5)
    cy.dataCy("checkbox")
      .filter("[aria-checked='false']")
      .should("have.length", 37)
  })

  it("shows an error if common configuration query fails", () => {
    cy.intercept(`${configApiPath}/common`, { statusCode: 500 })

    mountComponent()

    cy.dataCy("error-banner").should("contain", "Internal Server Error")
  })

  it("shows an error if common configuration validation fails", () => {
    cy.get<SinonStub>("@common-config-parse-stub").invoke(
      "rejects",
      "stubbed common configuration validation",
    )

    mountComponent()

    cy.dataCy("error-banner").should(
      "contain",
      "stubbed common configuration validation",
    )
  })

  it("shows an error if one of partner configuration queries fails", () => {
    cy.intercept({ pathname: `${configApiPath}/_`, times: 1 }, {})
    cy.intercept(`${configApiPath}/_`, { statusCode: 401 })

    mountComponent()

    cy.dataCy("error-banner").should("contain", "Unauthorized")
  })

  it("shows an error if one of partner configuration validation fails", () => {
    cy.get<SinonStub>("@partner-config-parse-stub").then((stub) => {
      stub
        .onFirstCall()
        .resolves({
          title: "",
          shiftEngaged: [],
        })
        .rejects("stubbed partner configuration validation")
    })

    mountComponent()

    cy.dataCy("error-banner").should(
      "contain",
      "stubbed partner configuration validation",
    )
  })

  it("disables the save button if cycle time is invalid", () => {
    mountComponent()

    cy.dataCy("save-button").should("not.have.class", "disabled")

    cy.dataCy("cycle-time-input").invoke("first").as("first-cycle-time-input")

    cy.get("@first-cycle-time-input").clear()
    cy.get("@first-cycle-time-input").type("0.0")
    cy.dataCy("save-button").should("have.class", "disabled")

    cy.get("@first-cycle-time-input").clear()
    cy.get("@first-cycle-time-input").type("10.0")
    cy.dataCy("save-button").should("not.have.class", "disabled")
  })

  it("disables the save button if efficiency is invalid", () => {
    mountComponent()

    cy.dataCy("save-button").should("not.have.class", "disabled")

    cy.dataCy("efficiency-input").invoke("first").as("first-efficiency-input")

    cy.get("@first-efficiency-input").type("{selectAll}")
    cy.get("@first-efficiency-input").type("101")
    cy.dataCy("save-button").should("have.class", "disabled")

    cy.get("@first-efficiency-input").type("{selectAll}")
    cy.get("@first-efficiency-input").type("10.0")
    cy.dataCy("save-button").should("not.have.class", "disabled")
  })

  it("checks and unchecks all with buttons", () => {
    mountComponent()

    cy.dataCy("checkbox")
      .filter("[aria-checked='false']")
      .should("have.length", 2)
    cy.dataCy("checkbox")
      .filter("[aria-checked='true']")
      .should("have.length", 2)

    cy.dataCy("check-all-button").click()
    cy.dataCy("checkbox")
      .filter("[aria-checked='false']")
      .should("have.length", 0)
    cy.dataCy("checkbox")
      .filter("[aria-checked='true']")
      .should("have.length", 4)

    cy.dataCy("uncheck-all-button").click()
    cy.dataCy("checkbox")
      .filter("[aria-checked='false']")
      .should("have.length", 4)
    cy.dataCy("checkbox")
      .filter("[aria-checked='true']")
      .should("have.length", 0)
  })

  it("send an update request with the button", () => {
    cy.intercept(
      "PATCH",
      `${configApiPath}/*`,
      cy
        .stub()
        .as("response-stub")
        .callsFake((req: CyHttpMessages.IncomingHttpRequest) => {
          req.reply({ statusCode: 200 })
        }),
    )

    mountComponent()
    cy.dataCy("checkbox").should("have.length", 4)

    cy.dataCy("save-button").click()

    cy.get("@response-stub")
      .should("have.been.calledTwice")
      .and(
        "have.been.calledWith",
        Cypress.sinon.match({
          body: {
            shiftEngaged: [true, false],
            targetCycleTime: 60,
            targetEfficiency: 1,
          },
        }),
      )
    cy.dataCy("save-button").should("have.class", "disabled")
  })

  it("shows an error notification when at least one patch request fails", () => {
    cy.intercept(
      "PATCH",
      { pathname: `${configApiPath}/_`, times: 1 },
      { statusCode: 200 },
    )
    cy.intercept("PATCH", `${configApiPath}/*`, { statusCode: 403 })

    mountComponent()
    cy.dataCy("checkbox").should("have.length", 4)

    cy.dataCy("save-button").click()

    cy.get(".q-notification[role='alert']").should("contain", "Forbidden")
    cy.dataCy("save-button").should("have.class", "disabled")
  })
})
