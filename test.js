const obj = {
    'a': 'b',
    'c': 'd',
}
const b = 'ccccc'
const obj2 = { ...obj, [b]: 'bbbb'}
console.log(obj2)