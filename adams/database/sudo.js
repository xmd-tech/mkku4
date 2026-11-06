
const { database } = require('../../config');
const { DataTypes, Op } = require('sequelize');
const { sudoIdentity, sudoAliases } = require('../lib/authorization');

const SudoDB = database.define('sudo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    jid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    timestamps: false,
});

async function initSudoDB() {
    try {
        await SudoDB.sync({ alter: true });
        console.log('Sudo table ready');
    } catch (error) {
        console.error('Error initializing sudo table:', error);
        throw error;
    }
}


function getSudoNumbers() {
    return getAllSudoNumbers();
}

function setSudo(jid) {
    return addSudoNumber(jid);
}

function delSudo(jid) {
    return removeSudoNumber(jid);
}

// Database functions
async function isSudo(jid) {
    try {
        const aliases = sudoAliases(jid);
        if (!aliases.length) return false;
        const count = await SudoDB.count({ where: { jid: { [Op.in]: aliases } } });
        return count > 0;
    } catch (error) {
        console.error('Error checking sudo status:', error);
        return false;
    }
}

async function addSudoNumber(jid) {
    const canonical = sudoIdentity(jid);
    if (!canonical) throw new Error('Reply to or mention the account, or provide its phone number. A bare username cannot be verified.');
    try {
        if (await isSudo(canonical)) return false;
        const [result, created] = await SudoDB.findOrCreate({
            where: { jid: canonical },
            defaults: { jid: canonical }
        });
        if (created) {
            console.log(`✅ Added sudo number: ${jid}`);
            return true;
        } else {
            console.log(`ℹ️ Sudo number already exists: ${jid}`);
            return false; // already exists
        }
    } catch (error) {
        throw new Error('Could not save sudo access. Please try again.', { cause: error });
    }
}

async function removeSudoNumber(jid) {
    try {
        const aliases = sudoAliases(jid);
        // Permit deleting old, unbound username rows, never granting via them.
        if (!aliases.length && typeof jid === 'string' && /^@?[a-z_][a-z0-9_.]*$/i.test(jid)) {
            aliases.push(jid.replace(/^@/, '').toLowerCase());
        }
        if (!aliases.length) return false;
        const deleted = await SudoDB.destroy({ where: { jid: { [Op.in]: aliases } } });
        if (deleted) {
            console.log(`✅ Removed sudo number: ${jid}`);
            return true;
        } else {
            console.log(`ℹ️ Sudo number not found: ${jid}`);
            return false; // not found
        }
    } catch (error) {
        throw new Error('Could not remove sudo access. Please try again.', { cause: error });
    }
}

async function getAllSudoNumbers() {
    try {
        const results = await SudoDB.findAll({
            attributes: ['jid'],
            raw: true
        });
        return results.map(item => item.jid);
    } catch (error) {
        throw new Error('Could not read sudo access.', { cause: error });
    }
}

async function isSudoTableNotEmpty() {
    try {
        const count = await SudoDB.count();
        return count > 0;
    } catch (error) {
        console.error('❌ Error checking sudo table:', error);
        return false;
    }
}


initSudoDB().catch(err => {
    console.error('❌ Failed to initialize sudo database:', err);
});


module.exports = {
   
    getSudoNumbers,
    setSudo,
    delSudo,
    isSudo,
    addSudoNumber,
    removeSudoNumber,
    getAllSudoNumbers,
    isSudoTableNotEmpty,
    initSudoDB,
    SudoDB
};
