import {describe,test,expect} from 'bun:test';
import {validatePublicReview,featuredReviews,type CustomerReview} from '../src/lib/reviews';
const input={reviewer_name:' Sue ',location:' Melbourne ',review_text:'Excellent communication and prompt delivery.',consent:true,website:''};
describe('customer review submissions',()=>{
 test('publication, attribution and ratings cannot be supplied by a visitor',()=>{
  const row=validatePublicReview({...input,published:true,featured:true,archived:true,rating:5,sort_order:-999,product_slug:'fake-product',review_date:'2000-01-01',id:'existing-review'});
  expect(row).toEqual({reviewer_name:'Sue',location:'Melbourne',review_text:input.review_text,published:false,featured:false,archived:false,rating:null,sort_order:0,product_slug:null,review_date:null});
  expect(featuredReviews([{...row,id:'new',created_at:new Date().toISOString()} as CustomerReview])).toEqual([]);
 });
 test('requires consent, real text and rejects honeypot submissions',()=>{
  expect(()=>validatePublicReview({...input,consent:false})).toThrow('confirm');
  expect(()=>validatePublicReview({...input,website:'https://spam.example'})).toThrow('Unable');
  expect(()=>validatePublicReview({...input,review_text:'  great '})).toThrow('10 characters');
  expect(()=>validatePublicReview({...input,reviewer_name:{toString:()=> 'Sue'}})).toThrow('details');
 });
 test('optional location, length limits and whitespace',()=>{
  expect(validatePublicReview({...input,location:'  '})).toMatchObject({location:null,rating:null});
  expect(()=>validatePublicReview({...input,review_text:'x'.repeat(2001)})).toThrow('2000');
  expect(()=>validatePublicReview({...input,location:'x'.repeat(121)})).toThrow('Location');
  expect(()=>validatePublicReview({...input,reviewer_name:'  '})).toThrow('name');
 });
});
