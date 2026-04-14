(function () {
  var HEAT_COLORS = [
    '#001A4B',
    '#0F254D',
    '#1D2F4F',
    '#2C3A51',
    '#3A4553',
    '#494F55',
    '#575A57',
    '#666559',
    '#746F5B',
    '#837A5D',
    '#91855F',
    '#A08F61',
    '#AE9A63'
  ]

  function toNumber(value) {
    var n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  function ordinal(n) {
    var v = Math.round(Number(n))
    var abs = Math.abs(v)
    var mod10 = abs % 10
    var mod100 = abs % 100
    if (mod10 === 1 && mod100 !== 11) return abs + 'st'
    if (mod10 === 2 && mod100 !== 12) return abs + 'nd'
    if (mod10 === 3 && mod100 !== 13) return abs + 'rd'
    return abs + 'th'
  }

  function normalizeAuthorityName(s) {
    if (!s) return ''
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ')
  }

  async function init() {
    var el = document.getElementById('map')
    if (!el) return



    var width = 980
    var height =     window.innerWidth > 760 ? 700 : 1000

    var loaded = await Promise.all([
      fetch('./data/administrative.json').then(function (r) {
        if (!r.ok) throw new Error('Failed to load map data')
        return r.json()
      }),
      d3.csv('./data/data.csv')
    ])
    var geo = loaded[0]
    var csv = loaded[1]

    var rankValues = []

    var authorityRows = csv
      .map(function (row) {
        return {
          name: row['LOCAL AUTHORITY'],
          region: row['Region'],
          rank: toNumber(row['OVERALL RANK']),
          lat: toNumber(row['Latitude']),
          lon: toNumber(row['Longitude']),
          antiSocialRank: toNumber(row['ANTI SOCIAL BEHAVIOUR RANK']),
          ownedRank: toNumber(row['% OF OWNED PROPERTIES RANK']),
          communityEventsRank: toNumber(row['GOOGLE SEARCH RANK']),
          awardsRank: toNumber(row['LOCAL COUNCIL AWARD WINS RANK']),
          amenitiesRank: toNumber(row['# OF SOCIAL AMENITIES RANK']),
          greenSpacesRank: toNumber(row['QUANTITY OF PUBLIC GREEN SPACES RANK'])
        }
      })
      .filter(function (d) {
        return d.rank !== null && d.lat !== null && d.lon !== null
      })

    var baseRank = d3.min(
      authorityRows.map(function (d) {
        return d.rank
      })
    )

    authorityRows.forEach(function (d) {
      d.displayRank = d.rank - baseRank + 1
    })

    authorityRows.forEach(function (d) {
      rankValues.push(d.rank)
    })

    // ---- table (below map) ----
    var syncRankTableRegionFilter = function () {}
    var tableHost = document.getElementById('rank-table')
    if (tableHost) {
      var sortState = { key: 'displayRank', dir: 1 }

      function tableSortValue(row, key) {
        if (key === 'nameRegion') return String(row.name || '').toLowerCase()
        if (key === 'displayRank') {
          return row.displayRank != null ? row.displayRank : Number.POSITIVE_INFINITY
        }
        var v = row[key]
        return v != null ? v : Number.POSITIVE_INFINITY
      }

      function computeSortedTableRows() {
        var key = sortState.key
        var dir = sortState.dir
        return authorityRows.slice().sort(function (a, b) {
          var va = tableSortValue(a, key)
          var vb = tableSortValue(b, key)
          if (typeof va === 'string') {
            var sc = va.localeCompare(String(vb), undefined, { sensitivity: 'base' })
            if (sc !== 0) return dir * sc
          } else if (va !== vb) {
            return dir * (va < vb ? -1 : 1)
          }
          if (a.rank !== b.rank) return a.rank - b.rank
          return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
            sensitivity: 'base'
          })
        })
      }

      var sorted = computeSortedTableRows()

      var columns = [
        { key: 'displayRank', label: 'Rank', format: function (v) { return ordinal(v) } },
        {
          key: 'nameRegion',
          label: 'Region',
          format: function (_, row) {
            return row.name + ', ' + row.region
          }
        },
        {
          key: 'antiSocialRank',
          label: 'Anti-social behaviour',
          labelMobile: 'Anti-social',
          icon: './images/anti-social.svg',
          format: function (v) { return ordinal(v) }
        },
        {
          key: 'ownedRank',
          label: 'Occupied properties',
          labelMobile: 'Owned properties',
          icon: './images/occupied-properties.svg',
          format: function (v) { return ordinal(v) }
        },
        {
          key: 'communityEventsRank',
          label: 'Community events',
          labelMobile: 'Community',
          icon: './images/community-events.svg',
          format: function (v) { return ordinal(v) }
        },
        { key: 'awardsRank', label: 'Awards', labelMobile: 'Awards', icon: './images/awards.svg', format: function (v) { return ordinal(v) } },
        { key: 'amenitiesRank', label: 'Amenities', labelMobile: 'Amenities', icon: './images/amenities.svg', format: function (v) { return ordinal(v) } },
        {
          key: 'greenSpacesRank',
          label: 'Green spaces',
          labelMobile: 'Green spaces',
          icon: './images/green-space.svg',
          format: function (v) { return ordinal(v) }
        }
      ]

      tableHost.innerHTML = ''
      var table = d3.select(tableHost).append('table').attr('class', 'rank-table')

      var thead = table.append('thead').append('tr')
      thead
        .selectAll('th')
        .data(columns)
        .join('th')
        .attr('scope', 'col')
        .attr('class', 'rank-table-th-sortable')
        .attr('role', 'columnheader')
        .attr('tabindex', '0')
        .each(function (c) {
          var th = d3.select(this)
          var inner = th.append('div').attr('class', 'rank-table-th-inner').style('text-align', 'left')
          if (c.icon) {
            inner
              .append('img')
              .attr('class', 'rank-table-th-icon')
              .attr('src', c.icon)
              .attr('width', 20)
              .attr('height', 20)
              .attr('alt', '')
              .attr('loading', 'lazy')
          }
          inner.append('span').attr('class', 'rank-table-th-label').text(c.label)
        })

      function rowEntityKey(d) {
        return String(d.name || '') + '\t' + String(d.region || '')
      }

      var tbody = table.append('tbody')
      var rows = tbody.selectAll('tr').data(sorted, rowEntityKey).join('tr')

      rows
        .attr('data-region', function (d) {
          return d.region || ''
        })
        .selectAll('td')
        .data(function (row) {
          return columns.map(function (c) {
            var value = c.key === 'nameRegion' ? row.name + ', ' + row.region : row[c.key]
            return { col: c, value: value, row: row }
          })
        })
        .join('td')
        .attr('data-label', function (d) {
          return d.col.labelMobile != null ? d.col.labelMobile : d.col.label
        })
        .attr('class', function (d) {
          if (d.col.key === 'displayRank') return 'rank-table-rank'
          if (d.col.key === 'nameRegion') return 'rank-table-name'
          return 'rank-table-metric'
        })
        .each(function (d) {
          var cell = d3.select(this)
          if (d.col.key === 'nameRegion') {
            cell.append('span').attr('class', 'rank-table-city').text(d.row.name || '')
            cell.append('span').attr('class', 'rank-table-region-sep').text(', ')
            cell.append('span').attr('class', 'rank-table-region-part').text(d.row.region || '')
            return
          }
          var text = ''
          if (d.value !== null && d.value !== undefined && d.value !== '') {
            text = d.col.format ? d.col.format(d.value, d.row) : String(d.value)
          }
          cell.append('span').attr('class', 'rank-table-cell-value').text(text)
        })

      function updateTableHeaderSortUi() {
        thead.selectAll('th').each(function (c) {
          var th = d3.select(this)
          var active = c.key === sortState.key
          th.attr('aria-sort', active ? (sortState.dir === 1 ? 'ascending' : 'descending') : null)
        })
      }

      function applyTableSort() {
        sorted = computeSortedTableRows()
        tbody.selectAll('tr').data(sorted, rowEntityKey).order()
        var rs = document.getElementById('region-select')
        syncRankTableRegionFilter(rs ? rs.value : '')
        updateTableHeaderSortUi()
      }

      function onTableSortHeader(c) {
        if (sortState.key === c.key) sortState.dir *= -1
        else {
          sortState.key = c.key
          sortState.dir = 1
        }
        applyTableSort()
      }

      thead
        .selectAll('th')
        .on('click', function (event, c) {
          onTableSortHeader(c)
        })
        .on('keydown', function (event, c) {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onTableSortHeader(c)
        })

      updateTableHeaderSortUi()

      syncRankTableRegionFilter = function (selectedValue) {
        var vis = 0
        tbody.selectAll('tr').each(function (d) {
          var tr = d3.select(this)
          var show = !selectedValue || (d && d.region === selectedValue)
          tr.style('display', show ? null : 'none')
          tr.attr('aria-hidden', show ? null : 'true')
          tr.classed('rank-table-band-a', false)
          tr.classed('rank-table-band-b', false)
          tr.classed('rank-table-first-row', false)
          if (!show || !d) return
          tr.classed('rank-table-first-row', vis === 0)
          tr.classed(vis % 2 === 0 ? 'rank-table-band-a' : 'rank-table-band-b', true)
          vis += 1
        })
      }
      syncRankTableRegionFilter('')
    }

    var svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('width', '100%')
      .attr('role', 'img')
      .attr('aria-label', 'Map of United Kingdom local authority districts')

    var projection = d3.geoMercator().fitSize([width, height], geo)
    var path = d3.geoPath().projection(projection)
    var minRank = d3.min(rankValues)
    var maxRank = d3.max(rankValues)

    function getColorForRank(rank) {
      if (rank === undefined || rank === null || minRank === undefined || maxRank === undefined) {
        return '#d8d8d8'
      }
      if (minRank === maxRank) return HEAT_COLORS[HEAT_COLORS.length - 1]

      // Rank 1 is "top" rank, so map lower numeric rank to warmer/higher palette colors.
      var t = (rank - minRank) / (maxRank - minRank)
      var idx = HEAT_COLORS.length - 1 - Math.round(t * (HEAT_COLORS.length - 1))
      var safeIdx = Math.max(0, Math.min(HEAT_COLORS.length - 1, idx))
      return HEAT_COLORS[safeIdx]
    }

    var featureStats = new Map()

    var authorityByNormalizedName = new Map()
    authorityRows.forEach(function (row) {
      authorityByNormalizedName.set(normalizeAuthorityName(row.name), row)
    })

    var nameMatchedRows = new Set()
    var nameMatchedFeatureIndices = new Set()
    geo.features.forEach(function (feature, i) {
      var props = feature.properties
      var lad = props && props.LAD13NM
      if (!lad) return
      var row = authorityByNormalizedName.get(normalizeAuthorityName(lad))
      if (!row) return
      featureStats.set(i, {
        sum: row.rank,
        count: 1,
        best: row.rank,
        bestAuthority: row
      })
      nameMatchedRows.add(row)
      nameMatchedFeatureIndices.add(i)
    })

    authorityRows.forEach(function (d) {
      if (nameMatchedRows.has(d)) return

      var candidatePoints = [
        [d.lon, d.lat],
        [-Math.abs(d.lon), d.lat],
        [Math.abs(d.lon), d.lat]
      ]

      for (var i = 0; i < geo.features.length; i++) {
        if (nameMatchedFeatureIndices.has(i)) continue
        var feature = geo.features[i]
        var contained = candidatePoints.some(function (pt) {
          return d3.geoContains(feature, pt)
        })
        if (!contained) continue

        var stat = featureStats.get(i) || {
          sum: 0,
          count: 0,
          best: Number.POSITIVE_INFINITY,
          bestAuthority: null
        }
        stat.sum += d.rank
        stat.count += 1
        if (d.rank < stat.best) {
          stat.best = d.rank
          stat.bestAuthority = d
        }
        featureStats.set(i, stat)
        break
      }
    })

    function pathRegionKey(index) {
      var stat = featureStats.get(index)
      if (stat && stat.bestAuthority) return stat.bestAuthority.region
      return null
    }

    var mapLayer = svg.append('g').attr('class', 'map-layer')
    var tooltip = d3
      .select(el)
      .append('div')
      .attr('class', 'map-tooltip')
      .style('opacity', 0)

    function getTooltipData(index) {
      var stat = featureStats.get(index)
      if (stat && stat.bestAuthority) {
        return {
          rank: stat.bestAuthority.displayRank,
          name: stat.bestAuthority.name,
          region: stat.bestAuthority.region
        }
      }
      return null
    }

    function moveTooltip(event) {
      var pointer = d3.pointer(event, el)
      var x = pointer[0]
      var y = pointer[1]
      tooltip.style('left', x + 14 + 'px').style('top', y - 14 + 'px')
    }

    mapLayer
      .selectAll('path')
      .data(geo.features)
      .join('path')
      .attr('d', path)
      .style('fill', function (_, i) {
        var stat = featureStats.get(i)
        if (!stat) return '#d8d8d8'
        var avgRank = stat.sum / stat.count
        return getColorForRank(avgRank)
      })
      .on('mouseenter', function (event, d) {
        var featureIndex = geo.features.indexOf(d)
        var tooltipData = getTooltipData(featureIndex)
        if (!tooltipData) {
          tooltip.style('opacity', 0)
          return
        }
        tooltip.html(
          '<div class="map-tooltip-rank">' +
          ordinal(tooltipData.rank) +
          '</div>' +
          '<div class="map-tooltip-name">' +
          tooltipData.name +
          '</div>' +
          '<div class="map-tooltip-region">' +
          tooltipData.region +
          '</div>'
        )
        moveTooltip(event)
        tooltip.style('opacity', 1)
      })
      .on('mousemove', function (event) {
        moveTooltip(event)
      })
      .on('mouseleave', function () {
        tooltip.style('opacity', 0)
      })
      .attr('vector-effect', 'non-scaling-stroke')

    function applyRegionFilter(selectedValue) {
      mapLayer.selectAll('path').style('opacity', function (_, i) {
        if (!selectedValue) return 1
        var region = pathRegionKey(i)
        return region === selectedValue ? 1 : 0.35
      })
      syncRankTableRegionFilter(selectedValue)
    }

    var regionSelect = document.getElementById('region-select')
    if (regionSelect && typeof Choices !== 'undefined') {
      var regions = Array.from(
        new Set(
          authorityRows.map(function (d) {
            return d.region
          })
        )
      )
        .filter(Boolean)
        .sort()
      regionSelect.innerHTML =
        '<option value="">Select Region</option>' +
        regions
          .map(function (r) {
            return '<option value="' + String(r).replace(/"/g, '&quot;') + '">' + r + '</option>'
          })
          .join('')
      new Choices(regionSelect, {
        searchEnabled: true,
        searchPlaceholderValue: 'Search region…',
        shouldSort: false,
        itemSelectText: '',
        allowHTML: false
      })
      regionSelect.addEventListener('change', function () {
        applyRegionFilter(regionSelect.value)
      })
      applyRegionFilter('')
    }

    var legendBar = document.getElementById('map-legend-bar')
    if (legendBar) {
      legendBar.style.background = 'linear-gradient(to right, ' + HEAT_COLORS.join(', ') + ')'
    }

    var zoom = d3
      .zoom()
      .scaleExtent([0.4, 24])
      .on('zoom', function (event) {
        mapLayer.attr('transform', event.transform)
      })

    svg.call(zoom)

    var cx = width / 2
    var cy = height / 2
    var initialMapScale = 1.30
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(cx, cy).scale(initialMapScale).translate(-cx, -cy)
    )

    function stopMapZoomBubble(e) {
      e.stopPropagation()
    }

    var zoomInEl = el.querySelector('.map-zoom-in')
    var zoomOutEl = el.querySelector('.map-zoom-out')
    ;[zoomInEl, zoomOutEl].forEach(function (btn) {
      if (!btn) return
      btn.addEventListener('pointerdown', stopMapZoomBubble)
      btn.addEventListener('mousedown', stopMapZoomBubble)
    })
    if (zoomInEl) {
      zoomInEl.addEventListener('click', function (e) {
        e.preventDefault()
        e.stopPropagation()
        svg.transition().duration(200).call(zoom.scaleBy, 1.32)
      })
    }
    if (zoomOutEl) {
      zoomOutEl.addEventListener('click', function (e) {
        e.preventDefault()
        e.stopPropagation()
        svg.transition().duration(200).call(zoom.scaleBy, 1 / 1.32)
      })
    }
  }

  init().catch(function (err) {
    console.error(err)
    var m = document.getElementById('map')
    if (m) {
      m.textContent =
        'Could not load map data. Serve this folder over HTTP (e.g. npx serve) so administrative.json can be fetched.'
    }
  })
})()