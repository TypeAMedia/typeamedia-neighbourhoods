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

  async function init() {
    var el = document.getElementById('map')
    if (!el) return



    var width = 980
    var height =     window.innerWidth > 760 ? 700 : 1000

    var loaded = await Promise.all([
      fetch('./data/uk-counties.json').then(function (r) {
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
    var tableHost = document.getElementById('rank-table')
    if (tableHost) {
      var sorted = authorityRows.slice().sort(function (a, b) {
        return a.rank - b.rank
      })

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

      var tbody = table.append('tbody')
      var rows = tbody.selectAll('tr').data(sorted).join('tr')

      rows
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
    }

    var svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('width', '100%')
      .attr('role', 'img')
      .attr('aria-label', 'Map of United Kingdom counties')

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

    authorityRows.forEach(function (d) {
      var candidatePoints = [
        [d.lon, d.lat],
        [-Math.abs(d.lon), d.lat],
        [Math.abs(d.lon), d.lat]
      ]

      for (var i = 0; i < geo.features.length; i++) {
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

    var authorityPoints = authorityRows.map(function (d) {
      var projected = projection([-Math.abs(d.lon), d.lat])
      return {
        name: d.name,
        region: d.region,
        rank: d.rank,
        displayRank: d.displayRank,
        x: projected ? projected[0] : null,
        y: projected ? projected[1] : null
      }
    })

    var nearestFallbackByFeature = new Map()

    geo.features.forEach(function (feature, i) {
      if (featureStats.has(i)) return

      var centroid = path.centroid(feature)
      if (!centroid || !Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return

      var nearest = null
      var minDistSq = Number.POSITIVE_INFINITY

      authorityPoints.forEach(function (p) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return
        var dx = centroid[0] - p.x
        var dy = centroid[1] - p.y
        var distSq = dx * dx + dy * dy
        if (distSq < minDistSq) {
          minDistSq = distSq
          nearest = p
        }
      })

      if (nearest) nearestFallbackByFeature.set(i, nearest)
    })

    function pathRegionKey(index) {
      var stat = featureStats.get(index)
      if (stat && stat.bestAuthority) return stat.bestAuthority.region
      var nearest = nearestFallbackByFeature.get(index)
      return nearest ? nearest.region : null
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
        if (stat) {
          var avgRank = stat.sum / stat.count
          return getColorForRank(avgRank)
        }
        var nearest = nearestFallbackByFeature.get(i)
        return nearest ? getColorForRank(nearest.rank) : '#d8d8d8'
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
    var initialMapScale = 1.10
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
        'Could not load map data. Serve this folder over HTTP (e.g. npx serve) so uk-counties.json can be fetched.'
    }
  })
})()