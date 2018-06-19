"use strict";
describe("W3C — Bibliographic References", () => {
  const localBiblio = {
    Zzz: {
      title: "Last Reference",
    },
    aaa: {
      title: "First Reference",
    },
    TestRef1: {
      title: "Test ref title",
      href: "http://test.com",
      authors: ["William Shakespeare"],
      publisher: "Publishers Inc.",
    },
    TestRef2: {
      title: "Second test",
      href: "http://test.com",
      authors: ["Another author"],
      publisher: "Testing 123",
    },
    TestRef3: {
      title: "Third test",
      href: "http://test.com",
      publisher: "Publisher Here",
    },
    FOOBARGLOP: {
      aliasOf: "BARBAR",
    },
    BARBAR: {
      title: "The BARBAR Spec",
    },
  };
  const body = `
    <section id='sotd'>
      <p>foo [[!TestRef1]] [[TestRef2]] [[!TestRef3]]</p>
    </section>
    <section id='sample'>
      <h2>Privacy</h2>
      <p>foo [[!FOOBARGLOP]] bar</p>
    </section>
    <section>
      <h2>Sorted</h2>
      <p>From [[!Zzz]] to [[!aaa]]</p>
    </secton>
  `;

  const ops = makeStandardOps({ localBiblio }, body);

  afterAll(flushIframes);
  const bibRefsURL = new URL("https://specref.herokuapp.com/bibrefs");

  let doc;
  let specRefOk;
  beforeAll(async () => {
    doc = await makeRSDoc(ops);
    specRefOk = (await fetch(bibRefsURL, { method: "HEAD" })).ok;
  });

  it("pings biblio service to see if it's running", () => {
    expect(specRefOk).toBeTruthy();
  });

  it("includes a dns-prefetch to bibref server", () => {
    const host = bibRefsURL.host;
    const link = doc.querySelector(`link[rel='dns-prefetch'][href*='${host}']`);
    expect(link).toBeTruthy();
    expect(link.classList.contains("removeOnSave")).toBeTruthy();
  });

  it("displays the publisher when present", () => {
    // Make sure the reference is added.
    let ref = doc.querySelector("#bib-testref1 + dd");
    expect(ref).toBeTruthy();
    // This prevents Jasmine from taking down the whole test suite if SpecRef is down.
    if (!specRefOk) {
      throw new Error(
        "SpecRef seems to be down. Can't proceed with this spec."
      );
    }
    expect(ref.textContent).toMatch(/Publishers Inc\.\s/);
    ref = null;
    // Make sure the ". " is automatically added to publisher.
    ref = doc.querySelector("#bib-testref2 + dd");
    expect(ref).toBeTruthy();
    expect(ref.textContent).toMatch(/Testing 123\.\s/);
    ref = null;
    // Make sure publisher is shown even when there is no author
    ref = doc.querySelector("#bib-testref3 + dd");
    expect(ref).toBeTruthy();
    expect(ref.textContent).toMatch(/Publisher Here\.\s/);
  });

  it("resolves a localy-aliased spec", () => {
    const ref = doc.querySelector("#bib-foobarglop + dd");
    expect(ref).toBeTruthy();
    expect(ref.textContent).toMatch(/BARBAR/);
  });

  it("normalizes aliases", async () => {
    const body = `
      <p id="refs-dom">[[DOM]] [[DOM4]] [[!dom]]</p>
      <p id="refs-local">[[LOCAL]] <a data-cite="LOCAL">PASS<a></p>
    `;
    const localBiblio = {
      LOCAL: {
        title: "Test ref title",
        href: "http://test.com",
      },
    };
    const ops = makeStandardOps({ localBiblio }, body);
    const doc = await makeRSDoc(ops);

    const refsDom = [...doc.querySelectorAll("p#refs-dom cite a")];
    expect(refsDom.length).toEqual(3);
    expect(refsDom[0].textContent).toEqual("DOM");
    expect(refsDom[1].textContent).toEqual("DOM4");
    expect(refsDom[2].textContent).toEqual("dom");
    expect(
      refsDom.every(a => a.getAttribute("href") === "#bib-dom")
    ).toBeTruthy();

    const nr = [...doc.querySelectorAll("#normative-references dt")];
    expect(nr.length).toEqual(1);
    expect(nr[0].textContent).toEqual("[dom]");

    const ir = [...doc.querySelectorAll("#informative-references dt")];
    expect(ir.length).toEqual(2);
    expect(ir[0].textContent).toEqual("[DOM]");
    expect(ir[1].textContent).toEqual("[LOCAL]");

    const refsLocal = [...doc.querySelectorAll("p#refs-local a")];
    expect(refsLocal[0].textContent).toEqual("LOCAL");
    expect(refsLocal[0].getAttribute("href")).toEqual("#bib-local");
    expect(refsLocal[1].href).toEqual("http://test.com/");
  });

  it("sorts references as if they were lowercase", () => {
    const { textContent: first } = doc.querySelector(
      "#normative-references dt:first-of-type"
    );
    const { textContent: last } = doc.querySelector(
      "#normative-references dt:last-of-type"
    );
    expect(first).toMatch("[a]");
    expect(last).toMatch("[Zzz]");
  });
});
