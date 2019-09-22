const mdTable = require ('markdown-table');

const { writeFileSync } = require('fs');
const { ensureDirSync } = require('fs-extra');
const { join } = require('path')


function MdReporter (options) {
  this.options = options;
  this.detail = [];
}

MdReporter.prototype.attach = function(eventEmitter){
  eventEmitter.on('clone', this.cloneFound.bind(this));
};

MdReporter.prototype.report = function(clones, statistic) {
  if (statistic) {
    const table = [['Format', 'Files analyzed', 'Total lines', 'Clones found', 'Duplicated lines', '%']];

    Object.keys(statistic.formats)
      .filter(format => statistic.formats[format].sources)
      .forEach((format) => {
        table.push(convertStatisticToArray(format, statistic.formats[format].total));
      });

    table.push(convertStatisticToArray('Total', statistic.total));

    const result = [mdTable(table),'','<details><summary>show detail</summary><p>',...this.detail,'</p></details>'].join('\n');

    ensureDirSync(this.options.output);
    writeFileSync(join(this.options.output, 'index.md'), result, 'utf-8');
  }
}

MdReporter.prototype.cloneFound = function(clone) {
  const { duplicationA, duplicationB, format } = clone;
  this.detail.push('Clone found (' + format + '):' + (clone.isNew ? red('*') : ''));
  this.detail.push(
    ` - ${duplicationA.sourceId} [${getSourceLocation(
      duplicationA.start,
      duplicationA.end
    )}]`
  );
  this.detail.push(
    `   ${duplicationB.sourceId} [${getSourceLocation(
      duplicationB.start,
      duplicationB.end
    )}]`
  );
  this.detail.push('');
}

const convertStatisticToArray = (format, statistic) => ([
  format,
  statistic.sources,
  statistic.lines,
  statistic.clones,
  statistic.duplicatedLines,
  statistic.percentage,
])

const getSourceLocation = (start, end) => `${start.line}:${start.column} - ${end.line}:${end.column}`;

module.exports.default = MdReporter;