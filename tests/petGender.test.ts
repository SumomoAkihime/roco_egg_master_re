import test from "node:test";
import assert from "node:assert/strict";
import {parseBreedingGender} from "../src/petGender";
test("explicit male and female packet genders are preserved",()=>{
 for(const male of [1,"1","male","♂","公","雄"])assert.equal(parseBreedingGender(male),"♂");
 for(const female of [2,"2","female","♀","母","雌"])assert.equal(parseBreedingGender(female),"♀");
});
test("unknown or genderless is never guessed as female",()=>{
 for(const unknown of [0,"0",null,undefined,"",3,"unknown","性别不明"])assert.equal(parseBreedingGender(unknown),undefined);
});
