import re
files=['05-back-to-school-encouragement-strategies','06-first-30-days-university-starter-plan','07-researchers-reentry-plan','08-lecturer-reentry-plan','09-free-study-resources-reading-plans']
libs=['Project Gutenberg','Open Library','Internet Archive','Google Books','PubMed Central','DOAJ','LibriVox','OpenAlex','Wikisource','Europeana','Zenodo','Open Textbook Library']
for n in files:
    t=open(r'D:\ANYFREEBOOK\docs\posts\%s.md'%n,encoding='utf-8').read()
    b=t.split('---',2)[2]
    lines=b.split('\n')
    tbl=0; inb=False; bl=0; inb2=False
    for l in lines:
        if l.strip().startswith('|'):
            if not inb: tbl+=1; inb=True
        else: inb=False
        if re.match(r'^\s*[-*]\s+', l):
            if not inb2: bl+=1; inb2=True
        else: inb2=False
    d=re.search(r'^description: "(.*)"$', t, re.M).group(1)
    print(n, 'words',len(b.split()), 'tables',tbl,'bullets',bl,'h2',len(re.findall(r'(?m)^## ',b)),'desc',len(d),'missingLibs',[x for x in libs if x not in b],'anyfree',b.count('ANYFREEBOOK'),'we',len(re.findall(r'(?i)\bwe\b',b)))
