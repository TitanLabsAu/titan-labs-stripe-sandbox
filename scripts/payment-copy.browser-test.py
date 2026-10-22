import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
  async with async_playwright() as p:
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(viewport={"width":1280,"height":1800})
    page = await context.new_page()
    await page.goto('http://localhost:8080', wait_until='networkidle')
    await page.wait_for_timeout(2500)
    await page.evaluate('''async () => {
      const { mountBankCopyFixture } = await import('/scripts/payment-copy.fixture.tsx');
      window.fixture = mountBankCopyFixture();
      window.copies = [];
      Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async value => window.copies.push(value)}});
    }''')
    await page.get_by_role('heading',name='Bank transfer',exact=True).wait_for()
    fields = {'PayID':'payments@example.invalid','Account name':'Demo Research Supplies','BSB':'012-034','Account number':'000123456','Amount payable (AUD)':'145.00','Payment reference':'TL-DEMO-0001'}
    for label, value in fields.items():
      button = page.get_by_role('button',name=f'Copy {label}',exact=True)
      assert await button.get_attribute('type') == 'button'
      await button.click()
      assert await page.evaluate('window.copies.at(-1)') == value
      await button.get_by_role('status').get_by_text('Copied', exact=True).wait_for()
    assert await page.evaluate('window.fixture.submissions()') == 0
    await page.locator('main').screenshot(path='/tmp/browser/bank-copy/desktop-light.png')
    await page.evaluate("document.documentElement.classList.remove('light'); document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'")
    await page.set_viewport_size({'width':390,'height':844})
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    await page.locator('main').screenshot(path='/tmp/browser/bank-copy/mobile-dark.png')
    await page.evaluate("() => { navigator.clipboard.writeText = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; }")
    await page.get_by_role('button',name='Copy BSB',exact=True).click()
    await page.get_by_role('alert').wait_for()
    assert await page.get_by_role('button',name='Copy BSB',exact=True).get_by_role('status').inner_text() == ''
    assert await page.evaluate('getSelection().toString()') == '012-034'
    await page.locator('main').screenshot(path='/tmp/browser/bank-copy/denied-mobile.png')
    await page.evaluate('window.fixture.render(true, 0)')
    await page.wait_for_timeout(150)
    print('blank buttons:', await page.get_by_role('button').all_text_contents(), await page.locator('form').inner_text())
    assert await page.get_by_role('button').count() == 2
    assert await page.get_by_role('button',name='Copy Amount payable (AUD)',exact=True).count() == 1
    await page.evaluate('window.fixture.render(true, NaN)')
    await page.wait_for_timeout(150)
    assert await page.get_by_role('button').count() == 1
    print('PASS: six raw values, leading zeros, success-only feedback, no form submission, denied clipboard/manual selection, blank rows, zero/invalid amounts and mobile overflow.')
    await browser.close()

asyncio.run(main())
