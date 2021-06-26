const mongoose = require('mongoose')

const User = new mongoose.Schema({
    _id: { type: Object, required: true },
    name: { type: String, required: true, alias: 'displayName' },
    email: { type: String, required: true },
    picture: { type: String, default: 'Update Profile' },
    accessToken: { type: String, required: true },
    mobileNo: {
        type: Number,
        required: true,
        default: 1111111111,
        validate: {
            validator: function (v) {
                return /d{10}/.test(v);
            },
            message: '{VALUE} is not valid number'
        }
    },
    address: { type: String, required: true, default: 'Address not updated' },
    about: { type: String, default: 'About not provided' }
});

UserTable = mongoose.model('users', User);

module.exports = UserTable;