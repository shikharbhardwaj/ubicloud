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
  
  // State variables
  let charts = {};
  let refreshInterval = null;
  let timeRange = '1h';
  let lastRefresh = new Date();
  let config = null;
  let autoRefreshActive = false;
  
  // Helper function to format bytes to human-readable format
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  // Get time range in seconds
  function getTimeRangeInSeconds(range) {
    const now = Math.floor(Date.now() / 1000);
    
    switch (range) {
      case '15m': return { start: now - 15 * 60, end: now };
      case '1h': return { start: now - 60 * 60, end: now };
      case '3h': return { start: now - 3 * 60 * 60, end: now };
      case '6h': return { start: now - 6 * 60 * 60, end: now };
      case '12h': return { start: now - 12 * 60 * 60, end: now };
      case '24h': return { start: now - 24 * 60 * 60, end: now };
      case '3d': return { start: now - 3 * 24 * 60 * 60, end: now };
      case '7d': return { start: now - 7 * 24 * 60 * 60, end: now };
      case '30d': return { start: now - 30 * 24 * 60 * 60, end: now };
      default: return { start: now - 60 * 60, end: now };
    }
  }
  
  // Function to create or update chart
  function createOrUpdateChart(chartElement, seriesResults, unit) {
    // Get chart ID and metadata
    const chartId = chartElement.attr('id');
    const metricName = chartElement.data('name');
    const combined = chartElement.data('combined') === true || chartElement.data('combined') === 'true';
    
    // Use the chart element directly
    const targetElement = chartElement;
    
    // Prepare series data for ApexCharts
    const series = [];
    
    // Process each series result to create the chart series
    seriesResults.forEach(result => {
      const seriesLabel = result.label;
      const seriesData = result.data;
      
      // Skip empty series
      if (!seriesData || !seriesData.data || !seriesData.data.result || !seriesData.data.result[0]) {
        console.warn(`No data for series ${seriesLabel} in ${metricName}`);
        return;
      }
      
      // Create a series object for this data
      const timeSeriesData = seriesData.data.result[0].values.map(point => ({
        x: new Date(point[0] * 1000),
        y: parseFloat(point[1]).toFixed(2)
      }));
      
      // Add to the series array
      series.push({
        name: seriesLabel,
        data: timeSeriesData
      });
    });
    
    // If we've got no data for any series, show message
    if (series.length === 0) {
      targetElement.html(`<div class="h-full w-full flex items-center justify-center">
        <p class="text-sm text-gray-500">No data available for this time range</p>
      </div>`);
      return;
    }
    
    // Check if we already have a chart instance
    if (charts[chartId] && charts[chartId].chartInstance) {
      // Just update the series data for the existing chart
      ApexCharts.exec(chartId, 'updateSeries', series);
      
      // Store updated series
      charts[chartId].series = series;
      return;
    }
    
    // Configure chart options based on the metric type
    let yAxisFormatter;
    let tooltipYFormatter;
    let yAxisTitle = '';
    
    if (unit === 'percent') {
      yAxisFormatter = (val) => `${val}%`;
      tooltipYFormatter = (val) => `${parseFloat(val).toFixed(2)}%`;
      yAxisTitle = 'Percent';
    } else if (unit === 'bytes' || unit === 'bytes/s') {
      yAxisFormatter = (val) => formatBytes(val);
      tooltipYFormatter = (val) => formatBytes(parseFloat(val)) + (unit === 'bytes/s' ? '/s' : '');
      yAxisTitle = unit === 'bytes/s' ? 'Bytes/s' : 'Size';
    } else {
      // Round to 2 decimal places for other units
      yAxisFormatter = (val) => parseFloat(val).toFixed(2);
      tooltipYFormatter = (val) => parseFloat(val).toFixed(2);
      yAxisTitle = unit || '';
    }
    
    // Define chart options
    const options = {
      chart: {
        id: chartId,
        type: 'line',
        height: '100%',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        animations: {
          enabled: false
        }
      },
      colors: ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#f43f5e'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      markers: {
        size: 0
      },
      grid: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10
        },
        strokeDashArray: 1
      },
      tooltip: {
        x: {
          format: 'dd MMM yyyy HH:mm:ss'
        },
        y: {
          formatter: tooltipYFormatter
        }
      },
      series: series,
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          formatter: function(val) {
            return new Date(val).toLocaleTimeString();
          }
        }
      },
      yaxis: {
        title: {
          text: yAxisTitle
        },
        labels: {
          formatter: yAxisFormatter
        },
        min: unit === 'percent' ? 0 : undefined,
        max: unit === 'percent' ? 100 : undefined,
        forceNiceScale: true
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left'
      }
    };
    
    // Create new chart or update existing one
    if (!charts[chartId] || !charts[chartId].chartInstance) {
      // Create new chart
      const chartInstance = new ApexCharts(targetElement[0], options);
      chartInstance.render();
      
      // Store chart instance and series for later updates
      charts[chartId] = {
        chartInstance: chartInstance,
        series: series
      };
    } else {
      // Update existing chart
      const chartInstance = charts[chartId].chartInstance;
      
      // Update series and options
      chartInstance.updateOptions(options, false, true);
      charts[chartId].series = series;
    }
  }
  
  // Function to fetch and update a single chart
  function fetchChartData(chartElement, config) {
    const metricName = chartElement.data('name');
    const unit = chartElement.data('unit');
    const chartId = chartElement.attr('id');
    const combined = chartElement.data('combined') === true || chartElement.data('combined') === 'true';
    
    // Get the Postgres resource ID from the URL
    const resourceId = window.location.pathname.split('/postgres/')[1].split('/')[0];
    
    // Get time range
    const { start, end } = getTimeRangeInSeconds(timeRange);
    
    // Calculate step size based on time range
    let stepSize = '1m';
    if (timeRange === '6h') stepSize = '1m';
    else if (timeRange === '12h') stepSize = '2m';
    else if (timeRange === '24h') stepSize = '5m';
    else if (timeRange === '3d') stepSize = '15m';
    else if (timeRange === '7d') stepSize = '30m';
    else if (timeRange === '30d') stepSize = '2h';
    
    // Get all series from this chart
    const allSeries = chartElement.find('.chart-series');
    
    // If no series found (old format), show error
    if (allSeries.length === 0) {
      console.error(`No series found for chart ${metricName}`);
      chartElement.html(`<div class="h-full w-full flex items-center justify-center">
        <p class="text-sm text-red-500">Chart configuration error: No series defined</p>
      </div>`);
      return Promise.resolve();
    }
    
    // Create promises for each series
    const seriesPromises = [];
    
    allSeries.each(function() {
      const seriesElement = $(this);
      const label = seriesElement.data('label');
      const query = seriesElement.data('query');
      
      // Prepare query parameters
      const params = new URLSearchParams({
        query: query,
        start: start,
        end: end,
        step: stepSize
      });
      
      // Build URL for the metrics-proxy endpoint
      const url = `${window.location}/metrics-proxy?${params.toString()}`;
      
      // Create a promise for this series
      const seriesPromise = fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Network response was not ok for ${label}`);
          }
          return response.json();
        })
        .then(data => {
          return {
            label: label,
            data: data
          };
        })
        .catch(error => {
          console.error(`Error fetching metric data for ${metricName} - ${label}:`, error);
          // Return empty series on error
          return {
            label: label,
            data: { data: { result: [] } }
          };
        });
      
      seriesPromises.push(seriesPromise);
    });
    
    // Wait for all series to be fetched
    return Promise.all(seriesPromises)
      .then(seriesResults => {
        // Process all series data
        createOrUpdateChart(chartElement, seriesResults, unit);
        return seriesResults;
      })
      .catch(error => {
        console.error(`Error fetching metric data for ${metricName}:`, error);
        // Show error message in chart
        chartElement.html(`<div class="h-full w-full flex items-center justify-center">
          <p class="text-sm text-red-500">Error loading metric data</p>
        </div>`);
      });
  }
  
  // Function to refresh all charts
  function refreshAllCharts() {
    if (!config) return;
    
    const startTime = new Date();
    lastRefresh = startTime;
    
    // Update refresh button state
    const $btn = $('#refresh-metrics-btn');
    const originalText = $btn.html();
    $btn.html('<svg class="animate-spin -ml-0.5 mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Refreshing');
    $btn.prop('disabled', true);
    
    // Create promises for all chart updates
    const promises = $('.apex-chart').map(function() {
      return fetchChartData($(this), config);
    }).get();
    
    // Wait for all charts to update
    Promise.all(promises)
      .then(() => {
        const endTime = new Date();
        const elapsedTime = (endTime - startTime) / 1000;
        console.log(`Charts refreshed in ${elapsedTime.toFixed(2)}s`);
        
        // Update refresh button state
        $btn.html(originalText);
        $btn.prop('disabled', false);
      })
      .catch(error => {
        console.error('Error refreshing charts:', error);
        // Update refresh button state
        $btn.html(originalText);
        $btn.prop('disabled', false);
      });
  }
  
  // Initialize auto-refresh
  function setupAutoRefresh() {
    // Toggle auto-refresh on checkbox change
    $('#auto-refresh-toggle').on('change', function() {
      autoRefreshActive = $(this).prop('checked');
      
      if (autoRefreshActive) {
        $('#refresh-interval').text('30s');
        
        // Clear existing interval if any
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
        
        // Set up new interval
        refreshInterval = setInterval(() => {
          refreshAllCharts();
          
          // Update timer text
          const nextRefresh = new Date(lastRefresh.getTime() + 30000);
          const now = new Date();
          const remainingSecs = Math.max(0, Math.floor((nextRefresh - now) / 1000));
          $('#refresh-interval').text(`${remainingSecs}s`);
        }, 1000); // Update countdown every second
        
        // Trigger an immediate refresh
        refreshAllCharts();
      } else {
        // Clear interval
        if (refreshInterval) {
          clearInterval(refreshInterval);
          refreshInterval = null;
        }
        
        $('#refresh-interval').text('30s');
      }
    });
  }
  
  // Handle time range selection
  function setupTimeRangeSelector() {
    $('#metrics-time-range').on('change', function() {
      timeRange = $(this).val();
      refreshAllCharts();
    });
  }
  
  // Initialize charts and controls
  function initialize() {
    // Fetch metrics configuration
    $.ajax({
      url: `${window.location.pathname.split('/postgres/')[0]}/postgres/metrics-config`,
      type: 'GET',
      dataType: 'json',
      success: function(data) {
        config = data;
        
        // Init charts
        $('.apex-chart').each(function() {
          fetchChartData($(this), config);
        });
        
        // Setup controls
        setupAutoRefresh();
        setupTimeRangeSelector();
        
        // Setup query toggle buttons
        $('.query-toggle').on('click', function() {
          const targetId = $(this).data('target');
          const $target = $(`#${targetId}`);
          
          // Toggle the target visibility
          $target.toggleClass('hidden');
          
          // Update button text
          if ($target.hasClass('hidden')) {
            $(this).text('Show Queries');
          } else {
            $(this).text('Hide Queries');
          }
        });
        
        // Manual refresh button
        $('#refresh-metrics-btn').on('click', refreshAllCharts);
      },
      error: function(xhr, status, error) {
        console.error('Failed to load metrics configuration:', error);
        $('.apex-chart').each(function() {
          $(this).html(`<div class="h-full w-full flex items-center justify-center">
            <p class="text-sm text-red-500">Error loading metrics configuration</p>
          </div>`);
        });
      }
    });
  }
  
  // Start initialization
  initialize();
}

