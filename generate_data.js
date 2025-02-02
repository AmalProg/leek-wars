const fs = require('fs')
const request = require('request-promise')
const util = require('util')
const { execSync } = require('child_process')

const values = [
	['hats', 'hats', 'hat/get-all', '{[key: string]: HatTemplate}'],
	['weapons', 'weapons', 'weapon/get-all', '{[key: string]: WeaponTemplate}'],
	['pomps', 'pomps', 'pomp/get-all', '{[key: string]: PompTemplate}'],
	['potions', 'potions', 'potion/get-all', '{[key: string]: PotionTemplate}'],
	['hat_templates', 'hat_templates', 'hat/get-templates', '{[key: string]: {id: number, item: number}}'],
	['chip_templates', 'chip_templates', 'chip/get-templates', '{[key: string]: {id: number, item: number}}'],
	['summon_templates', "summon_templates", 'summon/get-templates', '{[key: string]: SummonTemplate}'],
	['trophy_categories', 'trophy_categories', 'trophy/get-categories'],
	['items', null, 'item/get-all', '{[key: string]: ItemTemplate}'],
	['complexities', null, 'complexity/get-all', '{[key: string]: string}'],
]
const new_values = [
	['chips', 'chips', 'chip/get-all', '{[key: string]: ChipTemplate}', "import { ChipTemplate } from '@/model/chip'"],
	['functions', 'functions', 'function/get-all', 'readonly LSFunction[]', "import { LSFunction } from '@/model/function'"],
	['constants', 'constants', 'constant/get-all', 'readonly Constant[]', "import { Constant } from '@/model/constant'"],
	['trophies', 'trophies', 'trophy/get-all', 'readonly TrohyTemplate[]', "import { TrohyTemplate } from '@/model/trophy'"],
]
const promises = []

const master = execSync('git rev-parse --abbrev-ref HEAD').toString().trim() === 'master'
const host = master ? 'https://leekwars.com/' : 'http://localhost:8500/'

for (const value of new_values) {

	request(host + 'api/' + value[2]).then(data => {
		const json = JSON.parse(data)
		const file = 'src/model/' + value[1] + '.ts'
		const content = value[4] + "\n\nconst " + value[0].toUpperCase()
		+ (value[3] ? ': ' + value[3] : '')
		+ " = Object.freeze(" + util.inspect(value[1] ? json[value[1]] : json, {depth: Infinity, breakLength: Infinity, maxArrayLength: Infinity}) + ")"
		+ "\nexport { " + value[0].toUpperCase() + " }"
		fs.writeFileSync(file, content)
		console.log("data written: " + file)
	})
}

let r = 0
for (const value of values) {

	setTimeout(() => {
		const p = request(host + 'api/' + value[2])
		promises.push(p.then((data) => {
			const json = JSON.parse(data)
			console.log('received', value[0])
			return "const " + value[0].toUpperCase()
				+ (value[3] ? ': ' + value[3] : '')
				+ " = " + util.inspect(value[1] ? json[value[1]] : json, {depth: Infinity, breakLength: Infinity, maxArrayLength: Infinity})
				+ "\nexport { " + value[0].toUpperCase() + " }"
		}).catch((err) => {
			console.log("ERROR request failed for", value[0], ":", err.statusCode, err.error)
			process.exit()
	})) }, r += (master ? 250 : 0))
}

setTimeout(() => {
	Promise.all(promises).then((result) => {
		let data = `/** This file is auto-generated from script/generate_data.js **/
/* tslint:disable */
import { HatTemplate } from '@/model/hat'
import { ItemTemplate } from '@/model/item'
import { PompTemplate } from '@/model/pomp'
import { PotionTemplate } from '@/model/potion'
import { SummonTemplate } from '@/model/summon'
import { WeaponTemplate } from '@/model/weapon'
\n`
		for (const v of result) {
			data += v + "\n\n"
		}
		const file = 'src/model/data.ts'
		fs.writeFileSync(file, data)
		console.log(file + ' created successfully!')
	})
}, r)
