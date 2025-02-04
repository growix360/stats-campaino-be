import SESClient from "../clients/AWS.SES"
import { MetadataBearer } from "@aws-sdk/types"

import {
  CreateTemplateCommand,
  CreateTemplateResponse,
  SendBulkTemplatedEmailCommand,
} from "@aws-sdk/client-ses"

export const sendEmail = async (payload: {
  emailAddresses: string[]
  source: string
  template: string
  configurationSetName: string
}) => {
  const params = {
    Source: payload.source,
    Template: payload.template,
    ConfigurationSetName: payload.configurationSetName,
    Destinations: payload.emailAddresses.map((email) => ({
      Destination: { ToAddresses: [email] },
    })),
    DefaultTemplateData: JSON.stringify({}),
  }

  try {
    const command = new SendBulkTemplatedEmailCommand(params)
    const response = await SESClient.SESClient.send(command)
    console.log("Bulk email response:", response)
    return response
  } catch (error) {
    console.error("Error sending bulk email:", error)
    return error
  }
}

export const createTemplate = async (payload: {
  templateName: string
  subjectPart: string
  textPart: string
  htmlPart: string
}): Promise<CreateTemplateResponse & MetadataBearer> => {
  const input = {
    Template: {
      TemplateName: payload.templateName,
      SubjectPart: payload.subjectPart,
      TextPart: payload.textPart,
      HtmlPart: payload.htmlPart,
    },
  }

  try {
    const command = new CreateTemplateCommand(input)
    const response = await SESClient.SESClient.send(command)
    console.log("Template created response:", response)
    return response
  } catch (error) {
    console.error("Error template:", error)
    throw new Error(`SES CreateTemplate failed: ${error}`)
  }
}
