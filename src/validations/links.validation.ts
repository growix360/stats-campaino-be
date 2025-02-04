import Joi from "joi"

const createLink = {
  body: Joi.object().keys({
    originalUrl: Joi.string().required(),
  }),
}

export default {
  createLink: createLink,
}
