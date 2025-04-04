$(function () {
  setupAutoRefresh();
  setupDatePicker();
  setupFormOptionUpdates();
  setupPlayground();
  setupFormsWithPatchMethod();
  setupMetricsCharts();
});

$(".toggle-mobile-menu").on("click", function (event) {
  let menu = $("#mobile-menu")
  if (menu.is(":hidden")) {
    menu.show(0, function () {
      menu.toggleClass("mobile-menu-open")
    });
  } else {
    menu.toggleClass("mobile-menu-open")
    setTimeout(function () {
      menu.hide();
    }, 300);
  }
});

$(".cache-group-row").on("click", function (event) {
  let repository = $(this).data("repository");
  $(this).toggleClass("active");
  $(".cache-group-" + repository).toggleClass("hidden");
});


$(document).click(function () {
  $(".dropdown").removeClass("active");
});

$(".dropdown").on("click", function (event) {
  event.stopPropagation();
  $(this).toggleClass("active");
});

$(".sidebar-group-btn").on("click", function (event) {
  $(this).parent().toggleClass("active");
});

$("#tag-membership-add tr, #tag-membership-remove tr").on("click", function (event) {
  let checkbox = $(this).find("input[type=checkbox]");
  if ($(event.target).is("input") || checkbox.prop("disabled")) {
    return;
  }
  checkbox.prop("checked", !checkbox.prop("checked"));
});

$("#ace-template").addClass('hidden');

var num_aces = 0;
$("#new-ace-btn").on("click", function (event) {
  event.preventDefault();
  num_aces++;
  var template = $('#ace-template').clone().removeClass('hidden').removeAttr('id');
  var pos = 0;
  var id_attr = '';
  template.find('select, input').each(function (i, element) {
    id_attr = 'ace-select-' + num_aces + '-' + pos;
    pos++;
    $(element).attr('id', id_attr);
  });
  template.find('label').attr('for', id_attr);
  template.insertBefore('#access-control-entries tbody tr:last');
});

$(".delete-btn").on("click", function (event) {
  event.preventDefault();
  let url = $(this).data("url");
  let csrf = $(this).data("csrf");
  let confirmation = $(this).data("confirmation");
  let confirmationMessage = $(this).data("confirmation-message");
  let redirect = $(this).data("redirect");
  let method = $(this).data("method");

  if (confirmation) {
    if (prompt(`Please type "${confirmation}" to confirm deletion`, "") != confirmation) {
      alert("Could not confirm resource name");
      return;
    }
  } else if (!confirm(confirmationMessage || "Are you sure to delete?")) {
    return;
  }

  $.ajax({
    url: url,
    type: method || "DELETE",
    data: { "_csrf": csrf },
    dataType: "json",
    headers: { "Accept": "application/json" },
    success: function (result) {
      window.location.href = redirect;
    },
    error: function (xhr, ajaxOptions, thrownError) {
      if (xhr.status == 404) {
        window.location.href = redirect;
        return;
      }

      let message = thrownError;
      try {
        response = JSON.parse(xhr.responseText);
        message = response.error?.message
      } catch { };
      alert(`Error: ${message}`);
    }
  });
});

$(".restart-btn").on("click", function (event) {
  if (!confirm("Are you sure to restart?")) {
    event.preventDefault();
  }
});

$(".copyable-content").on("click", ".copy-button", function (event) {
  let parent = $(this).parent();
  let content = parent.data("content");
  let message = parent.data("message");
  navigator.clipboard.writeText(content);

  if (message) {
    notification(message);
  }
})

$(".revealable-content").on("click", ".reveal-button", function (event) {
  $(this).parent().hide();
  $(this).parent().siblings(".revealed-content").show();
})

$(".revealable-content").on("click", ".hide-button", function (event) {
  $(this).parent().hide();
  $(this).parent().siblings(".shadow-content").show();
})

$(".back-btn").on("click", function (event) {
  event.preventDefault();
  history.back();
})

function notification(message) {
  let container = $("#notification-template").parent();
  let newNotification = $("#notification-template").clone();
  newNotification.find("p").text(message);
  newNotification.appendTo(container).show(0, function () {
    $(this)
      .removeClass("translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2")
      .addClass("translate-y-0 opacity-100 sm:translate-x-0");
  });

  setTimeout(function () {
    newNotification.remove();
  }, 2000);
}

function setupAutoRefresh() {
  $("div.auto-refresh").each(function () {
    const interval = $(this).data("interval");
    setTimeout(function () {
      location.reload();
    }, interval * 1000);
  });
}

function setupDatePicker() {
  if (!$.prototype.flatpickr) { return; }

  $(".datepicker").each(function () {
    let options = {
      enableTime: true,
      time_24hr: true,
      altInput: true,
      altFormat: "F j, Y H:i \\U\\T\\C",
      dateFormat: "Y-m-d H:i",
      monthSelectorType: "static",
      parseDate(dateStr, dateFormat) {
        // flatpicker uses browser timezone, but we want to customer to select UTC
        date = new Date(dateStr);
        return new Date(date.getUTCFullYear(), date.getUTCMonth(),
          date.getUTCDate(), date.getUTCHours(),
          date.getUTCMinutes(), date.getUTCSeconds());
      }
    };

    if ($(this).data("maxdate")) {
      options.maxDate = $(this).data("maxdate");
    }
    if ($(this).data("mindate")) {
      options.minDate = $(this).data("mindate");
    }
    if ($(this).data("defaultdate")) {
      options.defaultDate = $(this).data("defaultdate");
    }

    $(this).flatpickr(options);
  });
}

function setupFormOptionUpdates() {
  $('#creation-form').on('change', 'input', function () {
    let name = $(this).attr('name');
    option_dirty[name] = $(this).val();

    if ($(this).attr('type') !== 'radio') {
      return;
    }
    redrawChildOptions(name);
  });
}

function redrawChildOptions(name) {
  if (option_children[name]) {
    let value = $("input[name=" + name + "]:checked").val();
    let classes = $("input[name=" + name + "]:checked").parent().attr('class');
    classes = classes ? classes.split(" ") : [];
    classes = "." + classes.concat("form_" + name, "form_" + name + "_" + value).join('.');

    option_children[name].forEach(function (child_name) {
      let child_type = document.getElementsByName(child_name)[0].nodeName.toLowerCase();
      if (child_type == "input") {
        child_type = "input_" + document.getElementsByName(child_name)[0].type.toLowerCase();
      }

      let elements2select = [];
      switch (child_type) {
        case "input_radio":
          $("input[name=" + child_name + "]").parent().hide()
          $("input[name=" + child_name + "]").prop('disabled', true).prop('checked', false).prop('selected', false);
          $("input[name=" + child_name + "]").parent(classes).show()
          $("input[name=" + child_name + "]").parent(classes).children("input[name=" + child_name + "]").prop('disabled', false);

          if (option_dirty[child_name]) {
            elements2select = $("input[name=" + child_name + "][value=" + option_dirty[child_name] + "]").parent(classes);
          }

          if (elements2select.length == 0) {
            option_dirty[child_name] = null;
            elements2select = $("input[name=" + child_name + "]").parent(classes);
          }

          elements2select[0].children[0].checked = true;
          break;
        case "input_checkbox":

          break;
        case "select":
          $("select[name=" + child_name + "]").children().hide().prop('disabled', true).prop('checked', false).prop('selected', false);
          $("select[name=" + child_name + "]").children(".always-visible, " + classes).show().prop('disabled', false);

          if (option_dirty[child_name]) {
            elements2select = $("select[name=" + child_name + "]").children(classes + "[value=" + option_dirty[child_name] + "]");
          }

          if (elements2select.length == 0) {
            option_dirty[child_name] = null;
            elements2select = $("select[name=" + child_name + "]").children(".always-visible, " + classes);
          }

          elements2select[0].selected = true;
          break;
      }

      redrawChildOptions(child_name);
    });
  }
}

function setupPlayground() {
  if ($(document).attr('title') !== 'Ubicloud - Playground') {
    return;
  }

  function show_tab(name) {
    $(".inference-tab").removeClass("active");
    $(".inference-response").hide();
    $(`#inference_tab_${name}`).show().parent().addClass("active");
    $(`#inference_response_${name}`).show().removeClass("max-h-96");
  }

  $(".inference-tab").on("click", function (event) {
    show_tab($(this).data("target"));
  });

  $('#inference_tab_preview').hide();

  let controller = null;

  const reasoningExtension = {
    name: "reasoning",
    level: "block",
    format_reasoning(text) {
      text = text.trim().replace(/\n+/g, '<br>');
      if (text.length > 0) {
        return `
          <div class="text-sm italic p-4 bg-gray-50 ">
            <div class="font-bold mb-4">Reasoning</div>
            ${text}
          </div>`;
      }
      return "";
    },
    tokenizer(src) {
      const match = src.match(/^<think>([\s\S]+?)(?:<\/think>|$)/);
      if (match) {
        return {
          type: "reasoning",
          raw: match[0],
          text: match[1].trim(),
        };
      }
      return false;
    },
    renderer(token) {
      if (token.type === "reasoning") {
        return reasoningExtension.format_reasoning(token.text);
      }
    }
  };
  marked.use({ extensions: [reasoningExtension] });

  const generate = async () => {
    if (controller) {
      controller.abort();
      $('#inference_submit').text("Submit");
      controller = null;
      return;
    }

    const prompt = $('#inference_prompt').val();
    const endpoint = $('#inference_endpoint').val();
    const api_key = $('#inference_api_key').val();

    if (!prompt) {
      alert("Please enter a prompt.");
      return;
    }
    if (!endpoint) {
      alert("Please select an inference endpoint.");
      return;
    }
    if (!api_key) {
      alert("Please select an inference api key.");
      return;
    }

    $('#inference_response_raw').text("");
    $('#inference_response_preview').text("");
    $('#inference_submit').text("Stop");
    show_tab("raw");
    $('#inference_tab_preview').hide();
    $('#inference_response_raw').addClass("max-h-96");

    controller = new AbortController();
    const signal = controller.signal;
    let content = "";
    let reasoning_content = ""

    try {
      const response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          model: $('#inference_endpoint option:selected').text().trim(),
          messages: [{ role: "user", content: prompt }],
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value).trim();
        const lines = chunk.split("data: ");
        const parsedLines = lines
          .filter((line) => line !== "" && line !== "[DONE]")
          .map((line) => JSON.parse(line));

        parsedLines.forEach((parsedLine) => {
          const new_content = parsedLine?.choices?.[0]?.delta?.content;
          const new_reasoning_content = parsedLine?.choices?.[0]?.delta?.reasoning_content;
          if (!new_content && !new_reasoning_content) {
            return;
          }
          content += new_content || "";
          reasoning_content += new_reasoning_content || "";
          const inference_response_raw = reasoning_content
            ? `[reasoning_content]\n${reasoning_content}\n\n[content]\n${content}`
            : content;
          $('#inference_response_raw').text(inference_response_raw);
        });
      }
      const inference_response_preview = DOMPurify.sanitize(
        reasoningExtension.format_reasoning(reasoning_content) + marked.parse(content));
      $('#inference_response_preview').html(inference_response_preview);
      show_tab("preview");
    }
    catch (error) {
      let errorMessage;

      if (signal.aborted) {
        errorMessage = "Request aborted.";
      } else if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage = "Unable to get a response from the endpoint. This may be due to network connectivity or permission-related issues.";
      } else {
        errorMessage = `An error occurred: ${error.message}`;
      }

      $('#inference_response_raw').text(errorMessage);
    } finally {
      $('#inference_submit').text("Submit");
      controller = null;
    }
  };

  $('#inference_submit').on("click", generate);
}

function setupFormsWithPatchMethod() {
  $("#creation-form.PATCH").on("submit", function (event) {
    event.preventDefault();

    var form = $(this);
    var jsonData = {};
    form.serializeArray().forEach(function(item) {
        jsonData[item.name] = item.value;
    });

    $.ajax({
        url: form.attr('action'),
        type: 'PATCH',
        dataType: "html",
        data: jsonData,
        success: function (response, status, xhr) {
          var redirectUrl = xhr.getResponseHeader('Location');
          if (redirectUrl) {
              window.location.href = redirectUrl;
          }
        },
        error: function (xhr, ajaxOptions, thrownError) {
          let message = thrownError;
          alert(`Error: ${message}`);
        }
    });
  });
}

function setupMetricsCharts() {
  // Only execute on postgres show page with metrics
  if (!$('.metrics-grid').length) {
    return;
  }

  function initializeCharts(config) {
    $('.metric-card').each(function() {
      const card = $(this);
      const chartContainer = card.find('.h-48');
      const metricName = card.find('h3').text();
      const queryElement = card.find('code');
      const query = queryElement.text();
      const unit = card.find('span').length ? card.find('span').text().split('Unit: ')[1] : '';
      
      // Clear the placeholder content
      chartContainer.empty();
      
      // Add a unique ID to the container if it doesn't already have one
      let chartId = chartContainer.attr('id');
      if (!chartId) {
        chartId = `metric-chart-${Math.random().toString(36).substr(2, 9)}`;
        chartContainer.attr('id', chartId);
      }
      
      // Get the Postgres resource ID from the URL
      const resourceId = window.location.pathname.split('/postgres/')[1].split('/')[0];
      
      // Create the chart
      createTimeSeriesChart(
        chartId, 
        metricName, 
        query, 
        unit, 
        resourceId
      );
    });
  }

  // Fetch metrics configuration (endpoint URL, credentials, etc.)
  $.ajax({
    url: `${window.location.pathname.split('/postgres/')[0]}/postgres/metrics-config`,
    type: 'GET',
    dataType: 'json',
    success: function(config) {
      // Initialize charts
      initializeCharts(config);
      
      // Set up refresh button
      $('#refresh-metrics-btn').on('click', function() {
        // Change button text and disable
        const $btn = $(this);
        const originalText = $btn.html();
        $btn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...');
        $btn.prop('disabled', true);
        
        // Reinitialize charts
        initializeCharts(config);
        
        // Reset button after a short delay
        setTimeout(function() {
          $btn.html(originalText);
          $btn.prop('disabled', false);
        }, 1000);
      });
    },
    error: function(xhr, status, error) {
      console.error('Failed to load metrics configuration:', error);
    }
  });
}

function createTimeSeriesChart(containerId, title, query, unit, resourceId) {
  // Set up dimensions and margins
  const container = document.getElementById(containerId);
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Create SVG
  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('class', 'd3-chart')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Add loading indicator
  const loading = svg.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight / 2)
    .attr('text-anchor', 'middle')
    .text('Loading data...');
  
  // Time range - last hour
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - 60 * 60; // 1 hour ago
  
  // Prepare the URL for metrics proxy
  const params = new URLSearchParams({
    query: query,
    start: startTime,
    end: endTime,
    step: '15s', // 15-second intervals
  });
  
  const url = `${window.location}/metrics-proxy?${params.toString()}`;
  
  // Fetch data from our metrics proxy
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Remove loading indicator
      loading.remove();
      
      if (!data.data || !data.data.result || data.data.result.length === 0) {
        svg.append('text')
          .attr('x', innerWidth / 2)
          .attr('y', innerHeight / 2)
          .attr('text-anchor', 'middle')
          .text('No data available');
        return;
      }
      
      // Process data
      const series = data.data.result.map(item => {
        // Extract metric name from the metric object
        const name = item.metric && Object.values(item.metric).join(', ');
        
        return {
          name: name,
          values: item.values.map(point => {
            let value = parseFloat(point[1]);
            
            return {
              time: new Date(point[0] * 1000),
              value: value
            };
          })
        };
      });
      
      // Helper function to format bytes to human-readable format
      function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      }
      
      // Set up time scale for X-axis
      const x = d3.scaleTime()
        .domain([new Date(startTime * 1000), new Date(endTime * 1000)])
        .range([0, innerWidth]);
      
      // Get min and max values for Y-axis scaling
      const allValues = series.flatMap(s => s.values.map(v => v.value));
      let yMin = d3.min(allValues);
      let yMax = d3.max(allValues);
      
      // For percentage metrics, use 0-100 scale
      if (unit === 'percent') {
        yMin = 0;
        yMax = 100;
      } else {
        // For other metrics, add padding
        const yPadding = (yMax - yMin) * 0.1;
        yMin = Math.max(0, yMin - yPadding); // Don't go below 0 for most metrics
        yMax = yMax + yPadding;
      }
      
      const y = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([innerHeight, 0]);
      
      // Add axes
      svg.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5));
      
      // Create y-axis with custom formatting for bytes
      let yAxis;
      if (unit === 'bytes') {
        yAxis = d3.axisLeft(y).tickFormat(d => formatBytes(d));
      } else if (unit === 'percent') {
        yAxis = d3.axisLeft(y).tickFormat(d => d + '%');
      } else {
        yAxis = d3.axisLeft(y);
      }
      
      // Add grid lines
      svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.3)
        .call(d3.axisLeft(y)
          .tickSize(-innerWidth)
          .tickFormat('')
        );
      
      svg.append('g')
        .call(yAxis);
      
      // Define line generator
      const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);
      
      // Color scale
      const color = d3.scaleOrdinal(d3.schemeCategory10);
      
      // Draw lines
      series.forEach((s, i) => {
        svg.append('path')
          .datum(s.values)
          .attr('fill', 'none')
          .attr('stroke', color(i))
          .attr('stroke-width', 2)
          .attr('d', line);
      });
      
      // Add tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', 'd3-chart tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('pointer-events', 'none');
      
      // Add transparent overlay for mouse events
      const overlay = svg.append('rect')
        .attr('class', 'overlay')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .on('mousemove', function(event) {
          const [mouseX] = d3.pointer(event, this);
          const date = x.invert(mouseX);
          const timestamp = date.getTime();
          
          // Find the closest data point for each series
          const points = [];
          series.forEach((s, i) => {
            const closest = s.values.reduce((prev, curr) => {
              const prevDiff = Math.abs(prev.time.getTime() - timestamp);
              const currDiff = Math.abs(curr.time.getTime() - timestamp);
              return prevDiff < currDiff ? prev : curr;
            });
            
            points.push({
              name: s.name,
              value: closest.value,
              time: closest.time,
              color: color(i)
            });
          });
          
          // Update tooltip
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px')
            .html(() => {
              const formattedTime = points[0].time.toLocaleTimeString();
              const rows = points.map(p => {
                // Format value appropriately based on unit
                let formattedValue;
                if (unit === 'bytes') {
                  formattedValue = formatBytes(p.value);
                } else if (unit === 'percent') {
                  formattedValue = p.value.toFixed(2) + '%';
                } else {
                  formattedValue = p.value.toFixed(2);
                }
                
                return `<div style="display:flex; align-items:center; margin:3px 0;">
                  <div style="width:10px; height:10px; background:${p.color}; margin-right:5px;"></div>
                  <span>${p.name ? p.name + ': ' : ''}${formattedValue}</span>
                </div>`;
              }).join('');
              
              return `
                <strong>${formattedTime}</strong>
                ${rows}
              `;
            });
        })
        .on('mouseout', function() {
          tooltip.style('opacity', 0);
        });
      
      // Add legend if there are multiple series
      if (series.length > 1) {
        const legend = svg.append('g')
          .attr('font-family', 'sans-serif')
          .attr('font-size', 10)
          .attr('text-anchor', 'end')
          .selectAll('g')
          .data(series)
          .enter().append('g')
          .attr('transform', (d, i) => `translate(0,${i * 20})`);
        
        legend.append('rect')
          .attr('x', innerWidth - 19)
          .attr('width', 19)
          .attr('height', 19)
          .attr('fill', (d, i) => color(i));
        
        legend.append('text')
          .attr('x', innerWidth - 24)
          .attr('y', 9.5)
          .attr('dy', '0.32em')
          .text(d => d.name);
      }
      
      // Add unit label if provided
      if (unit) {
        svg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('y', -margin.left + 15)
          .attr('x', -innerHeight / 2)
          .attr('text-anchor', 'middle')
          .text(unit);
      }
    })
    .catch(error => {
      console.error('Error fetching metric data:', error);
      loading.remove();
      
      svg.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .text('Error loading data');
    });
}