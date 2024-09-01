import { performRequest } from './auth.js';

const mainBlock = document.getElementById("main");

const storedAccessToken = localStorage.getItem('accessToken');

export async function renderUserDashboard(storedAccessToken) {
    mainBlock.innerHTML = '';
    
    let query = `
        {
            user {
                id
                lastName
                firstName
                email
                attrs
                auditRatio
                totalUp
                totalDown
                transactions(where: {type: {_eq: "xp"}, event: {id: {_eq: 148}}}) {
                    amount
                    path
                    type
                    createdAt
                    event {
                        id
                    }
                }
            }
        }
    `;

    const fetchUserLevel = async (userID) => {
        const levelQuery = `
        {
            transaction(
                where: {userId: {_eq: "${userID}"}, type: {_eq: "level"}, object: {type: {_regex: "project"}}}, 
                order_by: {amount: desc}, 
                limit: 1
            ) {
                amount
            }
        }
    `;

        const levelResponse = await performRequest(levelQuery, storedAccessToken);
        return levelResponse.data.transaction[0]?.amount || 'N/A';
    };

    let userData = await performRequest(query, storedAccessToken);
    const userLevel = await fetchUserLevel(userData.data.user[0].id);

    const userInfoSection = document.createElement("div");
    userInfoSection.innerHTML = `
        <div class="wrapper">
            <div class="container">
                <div class="children" id="userInfo">Basic user identification</div>
                <div class="children" id="xpDisplay">XP Amount</div>
                <div class="children svg" id="auditRatioGraph"></div>
            </div>
            <div id="xpProgressGraph" class="chart-container"></div><br><br>
	    <div class="backbutton-container">
	    	<a class="backbutton" href="#" id="logoutButton">Logout</a>
	    <div>
        </div>
    `;
    mainBlock.appendChild(userInfoSection);
    
    const logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', handleLogout);

    function handleLogout(event) {
        event.preventDefault();
        localStorage.removeItem('accessToken');
        window.location.reload();
    }

    const userInfo = document.getElementById("userInfo");
    userInfo.innerHTML = `
        <h2>${userData.data.user[0].firstName} ${userData.data.user[0].lastName}</h2>
        <h3>ID: ${userData.data.user[0].id}</h3> 
        <h3>${userData.data.user[0].email}</h3>
        <h3>${userData.data.user[0].attrs.addressStreet}, ${userData.data.user[0].attrs.addressCity}</h3>
        <h3>tel. ${userData.data.user[0].attrs.tel}</h3>
    `;

    const xpAmountDisplay = document.getElementById("xpDisplay");
    const totalXP = userData.data.user[0].transactions.reduce((total, transaction) => total + transaction.amount, 0);
    xpAmountDisplay.innerHTML = `
        <h2>XP Amount:</h2>
        <h2 style="font-size:40px; color:#fff; text-align:center;">${Math.ceil(totalXP/1000)} kB</h2>
        <h2>Level:</h2> 
        <h2 style="font-size:40px; color:#fff; text-align:center;">${userLevel}</h2>
    `;

    const upTxCount = (userData.data.user[0].totalUp / 1000000).toFixed(2);
    const downTxCount = (userData.data.user[0].totalDown / 1000000).toFixed(2);
    const auditTotalCount = parseFloat(downTxCount) + parseFloat(upTxCount);

    const auditRatioSvg = document.getElementById('auditRatioGraph');
    auditRatioSvg.innerHTML = `
        <div id="ratioContainer" style="text-align: center;">
            <div style="display: inline-block; margin-bottom: 10px;">
                <h3 style="color: #fff; margin: 0; padding: 5px 10px;">Ratio:</h3>
                <h3 style="color: #fff; margin: 0; padding: 5px 10px;">${userData.data.user[0].auditRatio.toFixed(3)}</h3>
            </div>
            <div style="margin-top: 10px; margin-left: 50px;">
                <h4 style="color: #fff; margin: 1px; margin-bottom: 1px;">Total Audits</h4>
                <svg id="auditRatioChart" width="350" height="150"></svg>
            </div>
        </div>
    `;

    const auditSvg = document.getElementById('auditRatioChart');
    const ratioChartWidth = 350;
    const ratioChartHeight = 150;
    const barHeight = 60;
    const maxBarWidth = 300;
    const barYPosition = ratioChartHeight / 2 - barHeight / 2;

    const ratioColors = ["#008000", "#ff0000"];
    const ratioLabels = ["Given", "Received"];
    const ratioData = [parseFloat(upTxCount), parseFloat(downTxCount)];

    const maxDataValue = auditTotalCount;

    let currentX = 20;

    ratioData.forEach((value, index) => {
        const sectionWidth = (value / maxDataValue) * maxBarWidth;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', currentX);
        rect.setAttribute('y', barYPosition);
        rect.setAttribute('width', sectionWidth);
        rect.setAttribute('height', barHeight);
        rect.setAttribute('fill', ratioColors[index]);
        auditSvg.appendChild(rect);

        const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valueText.setAttribute('x', currentX + sectionWidth / 2);
        valueText.setAttribute('y', barYPosition + barHeight / 2 + 12);
        valueText.setAttribute('text-anchor', 'middle');
        valueText.setAttribute('font-weight', 'bold');
        valueText.setAttribute('font-size', '14px');
        valueText.setAttribute('fill', '#fff');
        valueText.textContent = `${value} MB`;
        auditSvg.appendChild(valueText);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', currentX + sectionWidth / 2);
        label.setAttribute('y', barYPosition + barHeight / 2 - 8);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('font-size', '14px');
        label.setAttribute('fill', '#fff');
        label.textContent = ratioLabels[index];
        auditSvg.appendChild(label);

        currentX += sectionWidth;
    });

    const xpGraphSection = document.getElementById('xpProgressGraph');
    xpGraphSection.innerHTML = `
        <div class="chart-container">
            <p>XP Progression</p>
            <svg id="xpChart"></svg>
        </div>
        <div id="tooltip" class="tooltip"></div>
    `;

    let xpData = userData.data.user[0].transactions;
    xpData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let cumulativeSum = 0;
    xpData.forEach(d => {
        cumulativeSum += d.amount;
        d.cumulativeAmount = cumulativeSum / 1000;
    });

    const chartMargin = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = 1400 - chartMargin.left - chartMargin.right;
    const chartHeight = 700 - chartMargin.top - chartMargin.bottom;

    const xpSvg = document.getElementById('xpChart');
    xpSvg.setAttribute('width', chartWidth + chartMargin.left + chartMargin.right);
    xpSvg.setAttribute('height', chartHeight + chartMargin.top + chartMargin.bottom);

    const chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    chartGroup.setAttribute('transform', `translate(${chartMargin.left}, ${chartMargin.top})`);
    xpSvg.appendChild(chartGroup);

    function scaleX(date) {
        const minDate = new Date(Math.min(...xpData.map(d => new Date(d.createdAt))));
        const maxDate = new Date(Math.max(...xpData.map(d => new Date(d.createdAt))));
        return ((new Date(date) - minDate) / (maxDate - minDate)) * chartWidth;
    }

    function scaleY(amount) {
        const maxAmount = Math.max(...xpData.map(d => d.cumulativeAmount));
        return chartHeight - (amount / maxAmount) * chartHeight;
    }

    let pathD = `M${scaleX(xpData[0].createdAt)},${scaleY(xpData[0].cumulativeAmount)}`;
    for (let i = 1; i < xpData.length; i++) {
        pathD += ` L${scaleX(xpData[i].createdAt)},${scaleY(xpData[i].cumulativeAmount)}`;
    }

    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linePath.setAttribute('d', pathD);
    linePath.setAttribute('class', 'chart-line');
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', 'blue');
    chartGroup.appendChild(linePath);

    xpData.forEach(d => {
        const pointCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pointCircle.setAttribute('cx', scaleX(d.createdAt));
        pointCircle.setAttribute('cy', scaleY(d.cumulativeAmount));
        pointCircle.setAttribute('r', 5);
        pointCircle.setAttribute('class', 'chart-dot');
        pointCircle.setAttribute('fill', 'red');

        pointCircle.addEventListener('mouseover', (e) => showTooltip(e, d));
        pointCircle.addEventListener('mouseout', hideTooltip);

        chartGroup.appendChild(pointCircle);
    });

    function createAxis(orientation) {
        const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        if (orientation === 'x') {
            axisLine.setAttribute('x1', 0);
            axisLine.setAttribute('y1', chartHeight);
            axisLine.setAttribute('x2', chartWidth);
            axisLine.setAttribute('y2', chartHeight);
        } else {
            axisLine.setAttribute('x1', 0);
            axisLine.setAttribute('y1', 0);
            axisLine.setAttribute('x2', 0);
            axisLine.setAttribute('y2', chartHeight);
        }
        axisLine.setAttribute('class', 'chart-axis');
        axisLine.setAttribute('stroke', '#000');
        chartGroup.appendChild(axisLine);
    }

    createAxis('x');
    createAxis('y');

    function addAxisLabels() {
        const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xLabel.setAttribute('x', chartWidth / 2);
        xLabel.setAttribute('y', chartHeight + 40);
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('class', 'axis-label');
        xLabel.textContent = 'Date';
        chartGroup.appendChild(xLabel);

        const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yLabel.setAttribute('transform', `rotate(-90)`);
        yLabel.setAttribute('x', -chartHeight / 2);
        yLabel.setAttribute('y', -40);
        yLabel.setAttribute('text-anchor', 'middle');
        yLabel.setAttribute('class', 'axis-label');
        yLabel.textContent = 'XP (kB)';
        chartGroup.appendChild(yLabel);
    }

    addAxisLabels();

    function addAxisTicks() {
        const xTicks = 5;
        const yTicks = 5;

        const minDate = new Date(Math.min(...xpData.map(d => new Date(d.createdAt))));
        const maxDate = new Date(Math.max(...xpData.map(d => new Date(d.createdAt))));
        const dateRange = (maxDate - minDate);
        const tickInterval = dateRange / xTicks;

        for (let i = 0; i <= xTicks; i++) {
            const tickDate = new Date(minDate.getTime() + i * tickInterval);
            const x = scaleX(tickDate);
            const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tickLine.setAttribute('x1', x);
            tickLine.setAttribute('y1', chartHeight);
            tickLine.setAttribute('x2', x);
            tickLine.setAttribute('y2', chartHeight + 6);
            tickLine.setAttribute('stroke', '#000');
            chartGroup.appendChild(tickLine);

            const tickLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tickLabel.setAttribute('x', x);
            tickLabel.setAttribute('y', chartHeight + 20);
            tickLabel.setAttribute('text-anchor', 'middle');
            tickLabel.setAttribute('fill', '#fff');
            tickLabel.setAttribute('font-size', '10px');
            tickLabel.textContent = tickDate.toLocaleDateString();
            chartGroup.appendChild(tickLabel);
        }

        for (let i = 0; i <= yTicks; i++) {
            const y = chartHeight - (chartHeight / yTicks) * i;
            const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tickLine.setAttribute('x1', -6);
            tickLine.setAttribute('y1', y);
            tickLine.setAttribute('x2', 0);
            tickLine.setAttribute('y2', y);
            tickLine.setAttribute('stroke', '#fff');
            chartGroup.appendChild(tickLine);

            const tickLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tickLabel.setAttribute('x', -10);
            tickLabel.setAttribute('y', y);
            tickLabel.setAttribute('text-anchor', 'end');
            tickLabel.setAttribute('dominant-baseline', 'middle');
            tickLabel.setAttribute('fill', '#fff');
            tickLabel.setAttribute('font-size', '10px');
            const maxAmount = Math.max(...xpData.map(d => d.cumulativeAmount));
            const amount = maxAmount * (i / yTicks);
            tickLabel.textContent = Math.round(amount);
            chartGroup.appendChild(tickLabel);
        }
    }

    addAxisTicks();

    const tooltipElement = document.getElementById('tooltip');

    function showTooltip(event, data) {
        const pathName = data.path.split("/").pop();
        tooltipElement.textContent = `${pathName}: ${data.cumulativeAmount}`;
        tooltipElement.style.left = (event.pageX + 5) + 'px';
        tooltipElement.style.top = (event.pageY - 28) + 'px';
        tooltipElement.style.opacity = 1;
    }

    function hideTooltip() {
        tooltipElement.style.opacity = 0;
    }
}

